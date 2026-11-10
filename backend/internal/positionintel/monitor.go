// Package positionintel is Engine 02, the Existing Position Intelligence
// Engine. It does not discover trades: it monitors the user's open positions,
// reassesses them against their entry assumptions, risk limits and campaign
// goal, and recommends the best available action (hold, close, roll, reduce),
// showing what the position would look like afterwards.
package positionintel

import (
	"context"
	"errors"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	op "optiontrading/backend/internal/opportunities"
	"optiontrading/backend/internal/positions"
)

// Campaign is the goal and risk context a position is judged against.
type Campaign struct {
	ID             int64   `json:"id"`
	Name           string  `json:"name"`
	Capital        float64 `json:"capital"`
	NetTarget      float64 `json:"netTarget"`
	Earned         float64 `json:"earned"`
	WeeklyTarget   float64 `json:"weeklyTarget"`
	RequiredAnnual float64 `json:"requiredAnnual"` // fraction
	Risk           string  `json:"risk"`
}

// HistorySource gives a daily close (to reconstruct entry and expiry prices).
type HistorySource interface {
	CloseOn(ctx context.Context, symbol string, day time.Time) (float64, error)
}

// Engine assesses positions.
type Engine struct {
	Source  op.ChainSource
	History HistorySource // optional
	Now     func() time.Time
}

func (e *Engine) now() time.Time {
	if e.Now != nil {
		return e.Now()
	}
	return time.Now()
}

// legState is one leg repriced from the market.
type legState struct {
	positions.Leg
	mark      float64 // per share, now
	iv        float64
	delta     float64
	theta     float64 // per share per day (long-option sign)
	spread    float64 // fraction of mid
	oi        int64
	live      bool // priced from bid/ask
	estimated bool // contract not found: Black-Scholes estimate
	derived   bool // IV re-derived from the price
}

func (l legState) sign() float64 {
	if l.Action == "sell" {
		return -1
	}
	return 1
}

// state is a position (or a proposed one) priced at one moment.
type state struct {
	sym        string
	key        string // covered_call | csp | short_call | iron_condor | strangle | straddle | spread
	legs       []legState
	S          float64
	T          float64 // years to expiry
	dte        float64
	expiry     time.Time
	qty        int
	credit     float64 // net credit collected per share (all rolls included)
	entryPrice float64 // underlying at entry (covered call cost basis)
}

const (
	sharesPerContract = 100
	expiryHourUTC     = 20 // 16:00 New York
)

func daysTo(expiry, now time.Time) float64 {
	return expiry.Add(expiryHourUTC*time.Hour).Sub(now).Hours() / 24
}

// strategyKey normalises the stored strategy label.
func strategyKey(label string, legs []positions.Leg) string {
	l := strings.ToLower(label)
	switch {
	case strings.Contains(l, "covered"):
		return "covered_call"
	case strings.Contains(l, "condor"):
		return "iron_condor"
	case strings.Contains(l, "straddle"):
		return "straddle"
	case strings.Contains(l, "strangle"):
		return "strangle"
	case strings.Contains(l, "put") && len(legs) <= 1:
		return "csp"
	case strings.Contains(l, "call") && len(legs) <= 1:
		return "short_call"
	}
	return "spread"
}

// legacyLegs rebuilds legs for positions saved before legs were stored. Only
// single-leg strategies can be rebuilt from one strike.
func legacyLegs(p positions.Position) []positions.Leg {
	prem := p.PremiumCredit / sharesPerContract
	switch strategyKey(p.Strategy, nil) {
	case "covered_call", "short_call":
		return []positions.Leg{{Action: "sell", Type: "call", Strike: p.Strike, Premium: prem}}
	case "csp":
		return []positions.Leg{{Action: "sell", Type: "put", Strike: p.Strike, Premium: prem}}
	}
	return nil
}

var ErrNeedsLegs = errors.New("this position's legs are not recorded")

// chainFor returns the chain for an expiry date, or the nearest listed one
// (estimated=true) when that date isn't listed.
func (e *Engine) chainFor(ctx context.Context, sym string, expiry time.Time) (op.Chain, op.Chain, bool, error) {
	first, err := e.Source.Chain(ctx, sym, time.Time{})
	if err != nil {
		return op.Chain{}, op.Chain{}, false, err
	}
	day := func(t time.Time) string { return t.UTC().Format("2006-01-02") }
	var nearest time.Time
	for _, x := range first.Expirations {
		if day(x) == day(expiry) {
			if first.Expiration.Equal(x) {
				return first, first, false, nil
			}
			ch, err := e.Source.Chain(ctx, sym, x)
			return first, ch, false, err
		}
		if nearest.IsZero() || math.Abs(x.Sub(expiry).Hours()) < math.Abs(nearest.Sub(expiry).Hours()) {
			nearest = x
		}
	}
	if nearest.IsZero() {
		return first, first, true, nil
	}
	ch, err := e.Source.Chain(ctx, sym, nearest)
	return first, ch, true, err
}

// priceLeg finds the leg's contract in the chain and prices it; when the
// contract or expiry is missing it estimates with Black-Scholes using the
// nearest strike's volatility.
func priceLeg(l positions.Leg, ch op.Chain, S, T float64, estimatedExpiry bool) legState {
	ls := legState{Leg: l}
	call := l.Type == "call"
	list := ch.Puts
	if call {
		list = ch.Calls
	}
	var best *op.Contract
	for i := range list {
		c := &list[i]
		if best == nil || math.Abs(c.Strike-l.Strike) < math.Abs(best.Strike-l.Strike) {
			best = c
		}
	}
	exact := best != nil && math.Abs(best.Strike-l.Strike) < 0.01 && !estimatedExpiry
	iv := 0.0
	if best != nil {
		mid := 0.0
		switch {
		case best.Bid > 0 && best.Ask >= best.Bid:
			mid = (best.Bid + best.Ask) / 2
			ls.spread = (best.Ask - best.Bid) / mid
			ls.live = exact
		case best.LastPrice > 0:
			mid = best.LastPrice
		}
		iv = best.IV
		if iv < 0.02 || iv > 4 || !ls.live {
			// Re-derive from the quoted contract's own price and expiry.
			ct := T
			if estimatedExpiry {
				ct = math.Max(time.Until(ch.Expiration.Add(expiryHourUTC*time.Hour)).Hours()/24/365, 1.0/365)
			}
			if v, ok := op.ImpliedVol(call, S, best.Strike, ct, mid); ok {
				iv, ls.derived = v, true
			}
		}
		if exact && mid > 0 {
			ls.mark = mid
			ls.oi = best.OpenInterest
		}
	}
	if iv < 0.02 || iv > 4 {
		iv = 0.30 // last resort; flagged as estimated
		ls.derived = true
	}
	ls.iv = iv
	if ls.mark == 0 {
		ls.mark = op.Price(call, S, l.Strike, T, iv)
		ls.estimated = true
		ls.live = false
	}
	ls.delta = op.Delta(call, S, l.Strike, T, iv)
	ls.theta = op.Theta(call, S, l.Strike, T, iv)
	return ls
}

// Metrics describe a position (current or proposed) at one moment.
type Metrics struct {
	Strikes       string   `json:"strikes"`
	Expiry        string   `json:"expiry"`
	DTE           int      `json:"dte"`
	Contracts     int      `json:"contracts"`
	CreditTotal   float64  `json:"creditTotal"` // premium collected, $
	CostToClose   float64  `json:"costToClose"` // $ to buy back now
	Breakeven     float64  `json:"breakeven"`
	BreakevenHigh float64  `json:"breakevenHigh,omitempty"`
	POP           float64  `json:"pop"`     // percent
	MaxRisk       *float64 `json:"maxRisk"` // $; nil = unlimited
	Delta         float64  `json:"delta"`   // share-equivalent
	Theta         float64  `json:"theta"`   // $ per day earned from decay
	IV            float64  `json:"iv"`      // percent, short legs
	ShortDelta    float64  `json:"shortDelta"`
	Exposure      float64  `json:"exposure"` // delta × price, $
	Collateral    float64  `json:"collateral"`
	CapitalUsePct float64  `json:"capitalUsePct"`
	Moneyness     string   `json:"moneyness"` // OTM | ATM | ITM of the main short leg
}

func (st state) shortLegs() []legState {
	var out []legState
	for _, l := range st.legs {
		if l.Action == "sell" {
			out = append(out, l)
		}
	}
	return out
}

func (st state) metrics(c Campaign) Metrics {
	q := float64(st.qty)
	m := Metrics{Contracts: st.qty, Expiry: st.expiry.Format("2006-01-02"), DTE: int(math.Max(0, math.Round(st.dte)))}
	var strikes []string
	ivSum, n := 0.0, 0
	for _, l := range st.legs {
		strikes = append(strikes, fmt.Sprintf("%s %s %s", l.Action, money(l.Strike), l.Type))
		m.CostToClose += -l.sign() * l.mark * sharesPerContract * q
		m.Delta += l.sign() * l.delta * sharesPerContract * q
		// Decay P&L: a sold option (sign -1) earns its negative theta.
		m.Theta += l.sign() * l.theta * sharesPerContract * q
		if l.Action == "sell" {
			m.ShortDelta = math.Max(m.ShortDelta, math.Abs(l.delta))
			ivSum += l.iv
			n++
		}
	}
	m.Strikes = strings.Join(strikes, ", ")
	if n > 0 {
		m.IV = round1(ivSum / float64(n) * 100)
	}
	m.CreditTotal = round2(st.credit * sharesPerContract * q)
	m.CostToClose = round2(m.CostToClose)
	S, cr := st.S, st.credit
	shorts := st.shortLegs()
	avgIV := ivSum / math.Max(1, float64(n))
	switch st.key {
	case "covered_call":
		m.Delta += sharesPerContract * q
		basis := st.entryPrice
		if basis == 0 {
			basis = S
		}
		m.Breakeven = round2(basis - cr)
		m.POP = op.ProbOTM(true, S, shorts[0].Strike, st.T, shorts[0].iv) * 100
		m.MaxRisk = ptr(round2(m.Breakeven * sharesPerContract * q))
		m.Collateral = S * sharesPerContract * q
	case "csp":
		k := shorts[0].Strike
		m.Breakeven = round2(k - cr)
		m.POP = op.ProbOTM(false, S, m.Breakeven, st.T, shorts[0].iv) * 100
		m.MaxRisk = ptr(round2(m.Breakeven * sharesPerContract * q))
		m.Collateral = k * sharesPerContract * q
	case "short_call":
		k := shorts[0].Strike
		m.Breakeven = round2(k + cr)
		m.POP = (1 - op.ProbOTM(false, S, m.Breakeven, st.T, shorts[0].iv)) * 100
		m.Collateral = 0.2 * S * sharesPerContract * q
	default: // two-sided structures
		lo, hi := math.Inf(1), math.Inf(-1)
		for _, l := range shorts {
			lo, hi = math.Min(lo, l.Strike), math.Max(hi, l.Strike)
		}
		m.Breakeven, m.BreakevenHigh = round2(lo-cr), round2(hi+cr)
		m.POP = op.ProbBetween(S, m.Breakeven, m.BreakevenHigh, st.T, avgIV) * 100
		width := 0.0
		var longs []legState
		for _, l := range st.legs {
			if l.Action == "buy" {
				longs = append(longs, l)
			}
		}
		for _, s := range shorts {
			for _, b := range longs {
				if b.Type == s.Type {
					width = math.Max(width, math.Abs(b.Strike-s.Strike))
				}
			}
		}
		if width > 0 && len(longs) >= len(shorts) {
			m.MaxRisk = ptr(round2((width - cr) * sharesPerContract * q))
			m.Collateral = (width - cr) * sharesPerContract * q
		} else {
			m.Collateral = (0.2*S + cr) * sharesPerContract * q
		}
	}
	m.POP = round1(m.POP)
	m.Delta = round1(m.Delta)
	m.Theta = round2(m.Theta)
	m.Exposure = round2(m.Delta * S)
	m.Collateral = round2(m.Collateral)
	if c.Capital > 0 {
		m.CapitalUsePct = round1(m.Collateral / c.Capital * 100)
	}
	if len(shorts) > 0 {
		k := shorts[0]
		itm := (k.Type == "call" && S > k.Strike) || (k.Type == "put" && S < k.Strike)
		switch {
		case math.Abs(S-k.Strike)/S < 0.01:
			m.Moneyness = "ATM"
		case itm:
			m.Moneyness = "ITM"
		default:
			m.Moneyness = "OTM"
		}
	}
	return m
}

// Change is one way the position differs from its entry assumptions.
type Change struct {
	Label  string `json:"label"`
	From   string `json:"from"`
	To     string `json:"to"`
	Tone   string `json:"tone"` // good | bad | neutral
	Detail string `json:"detail"`
}

func round1(v float64) float64 { return math.Round(v*10) / 10 }
func round2(v float64) float64 { return math.Round(v*100) / 100 }
func ptr(v float64) *float64   { return &v }
func clamp01(v float64) float64 {
	return math.Max(0, math.Min(1, v))
}

func money(v float64) string {
	neg := v < 0
	s := fmt.Sprintf("%.2f", math.Abs(v))
	s = strings.TrimSuffix(s, ".00")
	whole, frac, _ := strings.Cut(s, ".")
	for i := len(whole) - 3; i > 0; i -= 3 {
		whole = whole[:i] + "," + whole[i:]
	}
	if frac != "" {
		whole += "." + frac
	}
	if neg {
		return "-$" + whole
	}
	return "$" + whole
}

func signedMoney(v float64) string {
	if v >= 0 {
		return "+" + money(v)
	}
	return money(v)
}

// sortedExpiries returns listed expiries after `after`, soonest first.
func sortedExpiries(all []time.Time, after time.Time) []time.Time {
	var out []time.Time
	for _, t := range all {
		if t.After(after) {
			out = append(out, t)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Before(out[j]) })
	return out
}

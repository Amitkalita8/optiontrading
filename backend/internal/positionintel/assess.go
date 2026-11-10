package positionintel

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	op "optiontrading/backend/internal/opportunities"
	"optiontrading/backend/internal/positions"
)

// Assessment is Engine 02's view of one open position.
type Assessment struct {
	PositionID   int64     `json:"positionId"`
	Symbol       string    `json:"symbol"`
	Strategy     string    `json:"strategy"`
	StrategyKey  string    `json:"strategyKey"`
	Description  string    `json:"description"` // "Sell 2 × $230 Call"
	GeneratedAt  time.Time `json:"generatedAt"`
	MarketPhase  string    `json:"marketPhase"`
	Health       string    `json:"health"` // healthy | watch | action_needed | expired | needs_details
	HealthReason string    `json:"healthReason"`
	PriceSource  string    `json:"priceSource"` // live | last-trade | estimated

	Overview       Overview  `json:"overview"`
	Entry          Snapshot  `json:"entry"`
	Current        *Metrics  `json:"current"`
	Changes        []Change  `json:"changes"`
	Recommendation Action    `json:"recommendation"`
	Alternatives   []Action  `json:"alternatives"`
	Decision       Decision  `json:"decision"`
	Campaign       *Campaign `json:"campaign"`

	backfill *Snapshot // reconstructed entry assumptions to store
	legs     []positions.Leg
}

// Overview is the position at a glance.
type Overview struct {
	Underlying            float64 `json:"underlying"`
	EntryUnderlying       float64 `json:"entryUnderlying"`
	UnderlyingChangePct   float64 `json:"underlyingChangePct"`
	EntryOptionPrice      float64 `json:"entryOptionPrice"`   // net credit per share at entry
	CurrentOptionPrice    float64 `json:"currentOptionPrice"` // net mark per share now
	Contracts             int     `json:"contracts"`
	Expiry                string  `json:"expiry"`
	DTE                   int     `json:"dte"`
	DaysHeld              int     `json:"daysHeld"`
	Credit                float64 `json:"credit"`
	CostToClose           float64 `json:"costToClose"`
	OptionPL              float64 `json:"optionPL"`
	SharePL               float64 `json:"sharePL"` // covered calls
	OpenPL                float64 `json:"openPL"`
	OpenPLPct             float64 `json:"openPLPct"`
	ProfitCapturedPct     float64 `json:"profitCapturedPct"`
	GoalContributionPct   float64 `json:"goalContributionPct"`
	WeeklyContributionPct float64 `json:"weeklyContributionPct"`
}

// Snapshot is the set of assumptions the position was opened with.
type Snapshot struct {
	Price         float64 `json:"price"`
	IV            float64 `json:"iv"` // percent
	Delta         float64 `json:"delta"`
	POP           float64 `json:"pop"`
	DTE           int     `json:"dte"`
	Reconstructed bool    `json:"reconstructed"`
}

// Step is one order the action needs.
type Step struct {
	Side        string  `json:"side"` // Buy to close | Sell to open | Buy to open | Sell to close
	Contracts   int     `json:"contracts"`
	Description string  `json:"description"`
	Price       float64 `json:"price"` // per share
}

// Action is one way to manage the position, with the resulting position.
type Action struct {
	ID       string             `json:"id"`
	Kind     string             `json:"kind"` // hold | close | roll | reduce | record_expiry
	Title    string             `json:"title"`
	Summary  string             `json:"summary"`
	Score    int                `json:"score"`
	Factors  map[string]float64 `json:"factors"`
	Playbook []string           `json:"playbook"`
	Steps    []Step             `json:"steps"`

	NetCredit           float64  `json:"netCredit"`  // $ received (+) or paid (−) by the action
	RealizedPL          float64  `json:"realizedPL"` // $ locked in on what is closed
	AdditionalDays      int      `json:"additionalDays"`
	NewExpiry           string   `json:"newExpiry,omitempty"`
	NewStrikes          string   `json:"newStrikes,omitempty"`
	Positioning         string   `json:"positioning"` // OTM | ATM | ITM | —
	Result              *Metrics `json:"result"`      // nil when nothing stays open
	GoalContributionPct float64  `json:"goalContributionPct"`
	GoalImpactPct       float64  `json:"goalImpactPct"` // vs holding
	Tradeoffs           []string `json:"tradeoffs"`

	// What the server applies on confirmation.
	CloseContracts    int             `json:"closeContracts"`
	CloseValue        float64         `json:"closeValue"` // $ per contract set to close
	NewLegs           []positions.Leg `json:"newLegs,omitempty"`
	NewCreditPerShare float64         `json:"newCreditPerShare,omitempty"`
}

// Decision is the AI decision layer for the recommended action.
type Decision struct {
	Summary           string      `json:"summary"`
	Reasons           []op.Reason `json:"reasons"`
	Invalidation      []op.Reason `json:"invalidation"`
	RiskChecks        []op.Check  `json:"riskChecks"`
	WithinLimits      bool        `json:"withinLimits"`
	Confidence        string      `json:"confidence"`
	ConfidencePct     int         `json:"confidencePct"`
	ConfidenceFactors []op.Check  `json:"confidenceFactors"`
	Disclosures       []string    `json:"disclosures"`
}

var strategyLabels = map[string]string{
	"covered_call": "Covered Call", "csp": "Cash-Secured Put", "short_call": "Short Call",
	"iron_condor": "Iron Condor", "strangle": "Short Strangle", "straddle": "Short Straddle", "spread": "Spread",
}

func defaults(c *Campaign) Campaign {
	if c == nil {
		return Campaign{Risk: "moderate", RequiredAnnual: 0.12}
	}
	out := *c
	if out.Risk == "" {
		out.Risk = "moderate"
	}
	if out.RequiredAnnual <= 0 {
		out.RequiredAnnual = 0.12
	}
	return out
}

func describe(legs []positions.Leg, qty int) string {
	var parts []string
	for _, l := range legs {
		side := "Sell"
		if l.Action == "buy" {
			side = "Buy"
		}
		parts = append(parts, fmt.Sprintf("%s %d × %s %s", side, qty, money(l.Strike), strings.Title(l.Type)))
	}
	return strings.Join(parts, " · ")
}

// Assess runs monitoring, reassessment, action selection and the
// recommendation for one open position.
func (e *Engine) Assess(ctx context.Context, p positions.Position, campaign *Campaign) (Assessment, error) {
	now := e.now()
	c := defaults(campaign)
	a := Assessment{PositionID: p.ID, Symbol: p.Symbol, Strategy: p.Strategy, GeneratedAt: now.UTC(),
		Changes: []Change{}, Alternatives: []Action{}, Campaign: campaign}
	legs := p.Legs
	if len(legs) == 0 {
		legs = legacyLegs(p)
	}
	a.StrategyKey = strategyKey(p.Strategy, legs)
	if label, ok := strategyLabels[a.StrategyKey]; ok && p.Strategy == "" {
		a.Strategy = label
	}
	a.legs = legs
	a.Description = describe(legs, p.Quantity)
	if len(legs) == 0 {
		a.Health = "needs_details"
		a.HealthReason = "The strikes of each leg aren't recorded, so the engine can't price this " + p.Strategy + "."
		a.Description = fmt.Sprintf("%d × %s (strike %s)", p.Quantity, p.Strategy, money(p.Strike))
		a.Recommendation = Action{ID: "hold", Kind: "hold", Title: "Add the leg details",
			Summary: "Record each leg's strike and type so the engine can monitor this position.", Positioning: "—"}
		return a, nil
	}

	expiry, err := time.Parse("2006-01-02", p.Expiry)
	if err != nil {
		a.Health = "needs_details"
		a.HealthReason = fmt.Sprintf("The expiry date %q isn't a valid date, so the position can't be priced. Edit it to YYYY-MM-DD.", p.Expiry)
		a.Recommendation = Action{ID: "hold", Kind: "hold", Title: "Fix the expiry date", Summary: a.HealthReason, Positioning: "—"}
		return a, nil
	}
	opened, _ := time.Parse("2006-01-02", p.OpenedAt)
	dte := daysTo(expiry, now)
	entryDTE := math.Max(1, daysTo(expiry, opened.Add(14*time.Hour)))
	creditPerShare := p.PremiumCredit / sharesPerContract

	first, ch, estimatedExpiry, err := e.chainFor(ctx, p.Symbol, expiry)
	if err != nil && dte >= 0 {
		return a, fmt.Errorf("option data unavailable for %s", p.Symbol)
	}
	S := first.Price

	// Expired: the outcome is settled by the closing price on expiry day.
	if dte < 0 {
		return e.expired(ctx, a, p, legs, expiry, S, creditPerShare, c)
	}

	T := math.Max(dte, 1.0/24) / 365
	st := state{sym: p.Symbol, key: a.StrategyKey, S: S, T: T, dte: dte, expiry: expiry, qty: p.Quantity, credit: creditPerShare}
	for _, l := range legs {
		st.legs = append(st.legs, priceLeg(l, ch, S, T, estimatedExpiry))
	}

	// Entry assumptions (reconstructed for positions saved without them).
	entry := Snapshot{Price: p.EntryPrice, IV: p.EntryIV * 100, Delta: p.EntryDelta, POP: p.EntryPOP, DTE: int(math.Round(entryDTE))}
	if entry.Price == 0 || entry.IV == 0 {
		entry.Reconstructed = true
		if entry.Price == 0 && e.History != nil && !opened.IsZero() {
			if px, err := e.History.CloseOn(ctx, p.Symbol, opened); err == nil && px > 0 {
				entry.Price = px
			}
		}
		if entry.Price == 0 {
			entry.Price = S
		}
		short := mainShort(legs)
		eT := entryDTE / 365
		if iv, ok := op.ImpliedVol(short.Type == "call", entry.Price, short.Strike, eT, math.Max(short.Premium, 0.01)); ok {
			entry.IV = iv * 100
		} else {
			entry.IV = mainShortState(st).iv * 100
		}
		entry.Delta = math.Abs(op.Delta(short.Type == "call", entry.Price, short.Strike, eT, entry.IV/100))
		entryState := st
		entryState.S, entryState.T, entryState.legs = entry.Price, eT, nil
		for _, l := range legs {
			ls := legState{Leg: l, iv: entry.IV / 100}
			ls.delta = op.Delta(l.Type == "call", entry.Price, l.Strike, eT, ls.iv)
			entryState.legs = append(entryState.legs, ls)
		}
		entryState.entryPrice = entry.Price
		entry.POP = entryState.metrics(c).POP
		a.backfill = &entry
	}
	entry.IV, entry.Delta, entry.POP = round1(entry.IV), round2(entry.Delta), round1(entry.POP)
	a.Entry = entry
	st.entryPrice = entry.Price

	cur := st.metrics(c)
	a.Current = &cur
	a.PriceSource = "live"
	for _, l := range st.legs {
		if l.estimated {
			a.PriceSource = "estimated"
			break
		}
		if !l.live {
			a.PriceSource = "last-trade"
		}
	}

	// Overview.
	ov := Overview{Underlying: round2(S), EntryUnderlying: round2(entry.Price), Contracts: p.Quantity,
		Expiry: p.Expiry, DTE: cur.DTE, Credit: cur.CreditTotal, CostToClose: cur.CostToClose,
		EntryOptionPrice: round2(creditPerShare)}
	if entry.Price > 0 {
		ov.UnderlyingChangePct = round2((S - entry.Price) / entry.Price * 100)
	}
	if p.Quantity > 0 {
		ov.CurrentOptionPrice = round2(cur.CostToClose / float64(p.Quantity) / sharesPerContract)
	}
	if !opened.IsZero() {
		ov.DaysHeld = int(math.Max(0, now.Sub(opened).Hours()/24))
	}
	ov.OptionPL = round2(ov.Credit - ov.CostToClose)
	if a.StrategyKey == "covered_call" {
		ov.SharePL = round2((S - entry.Price) * sharesPerContract * float64(p.Quantity))
	}
	ov.OpenPL = round2(ov.OptionPL + ov.SharePL)
	base := ov.Credit
	if a.StrategyKey == "covered_call" {
		base = entry.Price * sharesPerContract * float64(p.Quantity)
	}
	if base > 0 {
		ov.OpenPLPct = round1(ov.OpenPL / base * 100)
	}
	if ov.Credit > 0 {
		ov.ProfitCapturedPct = round1(ov.OptionPL / ov.Credit * 100)
	}
	if c.NetTarget > 0 {
		ov.GoalContributionPct = round1(math.Max(0, ov.OptionPL) / c.NetTarget * 100)
	}
	if c.WeeklyTarget > 0 {
		ov.WeeklyContributionPct = round1(math.Max(0, cur.Theta) * 7 / c.WeeklyTarget * 100)
	}
	a.Overview = ov

	a.Changes = changes(a, entry, cur, ov, first, expiry, now)

	// Identify the best available action.
	actions := e.actions(ctx, st, first, cur, ov, entryDTE, c, first.Earnings, now)
	sort.SliceStable(actions, func(i, j int) bool { return actions[i].Score > actions[j].Score })
	// Avoid churn: when holding is within 2 points of the best, hold.
	for i, x := range actions {
		if x.Kind == "hold" && i > 0 && actions[0].Score-x.Score <= 2 {
			actions = append([]Action{x}, append(actions[:i:i], actions[i+1:]...)...)
			break
		}
	}
	a.Recommendation = actions[0]
	a.Alternatives = actions[1:]

	tested := isTested(cur, c)
	switch {
	case a.Recommendation.Kind != "hold":
		a.Health, a.HealthReason = "action_needed", a.Recommendation.Title+": "+a.Recommendation.Summary
	case tested:
		a.Health, a.HealthReason = "watch", fmt.Sprintf("The short strike is being tested (delta %.2f).", cur.ShortDelta)
	case cur.DTE <= 7:
		a.Health, a.HealthReason = "watch", fmt.Sprintf("%d days to expiry: price moves now matter more.", cur.DTE)
	default:
		a.Health, a.HealthReason = "healthy", "On track with its entry assumptions and your risk limits."
	}
	a.Decision = decide(a, st, cur, c, first, expiry, now)
	return a, nil
}

func mainShort(legs []positions.Leg) positions.Leg {
	for _, l := range legs {
		if l.Action == "sell" {
			return l
		}
	}
	return legs[0]
}

func mainShortState(st state) legState {
	for _, l := range st.legs {
		if l.Action == "sell" {
			return l
		}
	}
	return st.legs[0]
}

func isTested(m Metrics, c Campaign) bool {
	_, max, _ := op.DeltaBand(c.Risk)
	return m.ShortDelta > max || m.Moneyness == "ITM"
}

func earningsBefore(earnings, expiry, now time.Time) bool {
	return !earnings.IsZero() && earnings.After(now) && !earnings.After(expiry.Add(expiryHourUTC*time.Hour))
}

func changes(a Assessment, entry Snapshot, cur Metrics, ov Overview, first op.Chain, expiry, now time.Time) []Change {
	var out []Change
	tone := func(bad bool) string {
		if bad {
			return "bad"
		}
		return "good"
	}
	if entry.Price > 0 {
		out = append(out, Change{"Underlying price", money(entry.Price), money(ov.Underlying), "neutral",
			fmt.Sprintf("%+.1f%% since entry", ov.UnderlyingChangePct)})
	}
	out = append(out, Change{"Short-strike delta", fmt.Sprintf("%.2f", entry.Delta), fmt.Sprintf("%.2f", cur.ShortDelta),
		tone(cur.ShortDelta > entry.Delta+0.03), "Higher means the price is closer to your short strike"})
	out = append(out, Change{"Probability of profit", fmt.Sprintf("%.0f%%", entry.POP), fmt.Sprintf("%.0f%%", cur.POP),
		tone(cur.POP < entry.POP-2), ""})
	out = append(out, Change{"Implied volatility", fmt.Sprintf("%.0f%%", entry.IV), fmt.Sprintf("%.0f%%", cur.IV),
		tone(cur.IV > entry.IV+2), "Rising volatility makes short options cost more to buy back"})
	out = append(out, Change{"Premium captured", "0%", fmt.Sprintf("%.0f%%", ov.ProfitCapturedPct),
		tone(ov.ProfitCapturedPct < 0), fmt.Sprintf("%s of %s credit", signedMoney(ov.OptionPL), money(ov.Credit))})
	out = append(out, Change{"Days to expiry", fmt.Sprintf("%d", entry.DTE), fmt.Sprintf("%d", cur.DTE), "neutral", ""})
	if earningsBefore(first.Earnings, expiry, now) {
		out = append(out, Change{"Earnings", "—", first.Earnings.Format("Jan 2"), "bad", "Earnings now fall before expiry"})
	}
	return out
}

// expired settles a position whose expiry has passed.
func (e *Engine) expired(ctx context.Context, a Assessment, p positions.Position, legs []positions.Leg, expiry time.Time, S, credit float64, c Campaign) (Assessment, error) {
	settle := S
	if e.History != nil {
		if px, err := e.History.CloseOn(ctx, p.Symbol, expiry); err == nil && px > 0 {
			settle = px
		}
	}
	intrinsic := 0.0 // per share, cost to settle the structure
	assigned := false
	for _, l := range legs {
		v := math.Max(0, settle-l.Strike)
		if l.Type == "put" {
			v = math.Max(0, l.Strike-settle)
		}
		if l.Action == "sell" {
			intrinsic += v
			assigned = assigned || v > 0
		} else {
			intrinsic -= v
		}
	}
	q := float64(p.Quantity)
	realized := round2((credit - intrinsic) * sharesPerContract * q)
	a.Health = "expired"
	a.Overview = Overview{Underlying: round2(settle), Contracts: p.Quantity, Expiry: p.Expiry, Credit: round2(credit * sharesPerContract * q),
		CostToClose: round2(intrinsic * sharesPerContract * q), OptionPL: realized, OpenPL: realized}
	title, summary := "Record: expired worthless", fmt.Sprintf("%s closed at %s on %s, so every short option expired worthless. Record the full %s premium.",
		p.Symbol, money(settle), expiry.Format("Jan 2"), money(a.Overview.Credit))
	if assigned {
		title = "Record: assignment at expiry"
		summary = fmt.Sprintf("%s closed at %s on %s, through the short strike. Expect assignment; record a %s result on the options.",
			p.Symbol, money(settle), expiry.Format("Jan 2"), signedMoney(realized))
	}
	a.HealthReason = summary
	a.Recommendation = Action{ID: "record_expiry", Kind: "record_expiry", Title: title, Summary: summary, Score: 100,
		RealizedPL: realized, CloseContracts: p.Quantity, CloseValue: round2(intrinsic * sharesPerContract), Positioning: "—",
		Factors: map[string]float64{}, Playbook: []string{"The expiry date has passed"}, Tradeoffs: []string{}, Steps: []Step{}}
	if c.NetTarget > 0 {
		a.Recommendation.GoalContributionPct = round1(math.Max(0, realized) / c.NetTarget * 100)
	}
	a.Decision = Decision{
		Summary:           summary,
		Reasons:           []op.Reason{{Title: "Expiry has passed", Desc: fmt.Sprintf("Settled at %s", money(settle))}},
		Invalidation:      []op.Reason{},
		RiskChecks:        []op.Check{},
		WithinLimits:      true,
		Confidence:        "High",
		ConfidencePct:     90,
		ConfidenceFactors: []op.Check{{Label: "Settlement price", Detail: "Closing price on the expiry date", Pass: true}},
		Disclosures:       []string{"Check your broker statement for the actual assignment or expiry outcome."},
	}
	return a, nil
}

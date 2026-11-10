package opportunities

import (
	"context"
	"errors"
	"fmt"
	"math"
	"sort"
	"strings"
	"sync"
	"time"

	"optiontrading/backend/internal/campaigns"
)

// Input is everything the engine needs about one campaign.
type Input struct {
	CampaignID   int64
	CampaignName string
	Tickers      []string

	// Campaign context.
	Capital         float64
	NetTarget       float64 // goal - capital
	Earned          float64
	WeeklyTarget    float64
	RequiredAnnual  float64 // annualized return (fraction) the goal needs
	CampaignEndDate time.Time

	// Current approach.
	Strategies []string // covered_call csp iron_condor straddle strangle
	Moneyness  string   // OTM ATM ITM
	Holding    string   // intraday 1-7d 1-4w 1m+
	Risk       string   // low moderate high
	Outlook    string   // bullish neutral bearish
}

// FromCampaign builds the engine input from a stored campaign.
func FromCampaign(c campaigns.Campaign, tickers []string, now time.Time) Input {
	m := c.MetricsAt(now)
	in := Input{
		CampaignID: c.ID, CampaignName: c.Name, Tickers: tickers,
		Capital: c.Capital, NetTarget: m.NetTarget, Earned: c.Earned, WeeklyTarget: m.WeeklyTarget,
		Strategies: c.Strategies, Moneyness: c.Moneyness, Holding: c.HoldingDuration,
		Risk: c.Risk, Outlook: c.MarketOutlook,
	}
	if c.Capital > 0 && m.TotalDays > 0 {
		in.RequiredAnnual = m.NetTarget / c.Capital / (float64(m.TotalDays) / 365)
	}
	in.CampaignEndDate, _ = time.Parse("2006-01-02", c.EndDate)
	return in
}

// Leg is one option in a trade.
type Leg struct {
	Action   string  `json:"action"` // sell | buy
	Type     string  `json:"type"`   // call | put
	Strike   float64 `json:"strike"`
	Premium  float64 `json:"premium"` // per share
	Delta    float64 `json:"delta"`
	IV       float64 `json:"iv"` // percent
	Contract string  `json:"contract"`
}

type Reason struct {
	Title string `json:"title"`
	Desc  string `json:"desc"`
}

// Opportunity is one ranked trade idea. Money is per contract set (one
// contract of each leg = 100 shares) unless named total*.
type Opportunity struct {
	ID          string  `json:"id"`
	Rank        int     `json:"rank"`
	Symbol      string  `json:"symbol"`
	StrategyKey string  `json:"strategyKey"`
	Strategy    string  `json:"strategy"`
	Description string  `json:"description"` // "Sell 1x AAPL $350 Call"
	Collateral  string  `json:"collateral"`
	Price       float64 `json:"currentPrice"`
	Strike      float64 `json:"strikePrice"` // main short strike
	StrikeText  string  `json:"strikeText"`
	Expiry      string  `json:"expiry"` // YYYY-MM-DD
	ExpiryDays  int     `json:"expiryDays"`
	Legs        []Leg   `json:"legs"`

	Premium         float64  `json:"premium"` // credit received, $
	CapitalRequired float64  `json:"capitalRequired"`
	MaxRisk         *float64 `json:"maxRisk"` // nil = unlimited
	MaxRiskText     string   `json:"maxRiskText"`
	Breakeven       float64  `json:"breakeven"`
	BreakevenHigh   float64  `json:"breakevenHigh,omitempty"`
	AnnualizedYield float64  `json:"annualizedYield"` // percent
	ReturnPct       float64  `json:"returnPct"`       // premium / capital, percent
	Delta           float64  `json:"delta"`           // position delta per share
	Theta           float64  `json:"theta"`           // $ earned per day from decay
	POP             float64  `json:"pop"`             // percent
	IV              float64  `json:"iv"`              // percent, short legs
	SpreadPct       float64  `json:"spreadPct"`
	OpenInterest    int64    `json:"openInterest"`
	Volume          int64    `json:"volume"`
	PriceSource     string   `json:"priceSource"` // live | last-trade

	Earnings             string `json:"earningsDate,omitempty"`
	EarningsBeforeExpiry bool   `json:"earningsBeforeExpiry"`
	ExDividend           string `json:"exDividendDate,omitempty"`

	Contracts             int     `json:"contracts"` // suggested
	TotalPremium          float64 `json:"totalPremium"`
	CapitalUsePct         float64 `json:"capitalUsePct"`
	GoalContributionPct   float64 `json:"goalContributionPct"`
	WeeklyContributionPct float64 `json:"weeklyContributionPct"`

	// Stage 4: risk and reward.
	MaxProfit    float64       `json:"maxProfit"`
	ReturnOnRisk *float64      `json:"returnOnRisk"` // percent; nil when the loss is not capped
	IVSource     string        `json:"ivSource"`     // market | derived
	Payoff       []PayoffPoint `json:"payoff"`

	// Stages 5-6: suitability (Score) and data reliability (Confidence) are
	// separate measurements.
	Score         int            `json:"score"` // 0-100
	Confidence    string         `json:"confidence"`
	ConfidencePct int            `json:"confidencePct"`
	RiskLevel     string         `json:"riskLevel"`
	Reasons       []Reason       `json:"reasons"`
	Warnings      []string       `json:"warnings"`
	Factors       Factors        `json:"factors"`
	Weights       map[string]int `json:"weights"`
	Decision      Decision       `json:"decision"`
}

// Factors are the 0-1 sub-scores behind Score.
type Factors struct {
	GoalFit   float64 `json:"goalFit"`
	Profit    float64 `json:"probability"`
	Liquidity float64 `json:"liquidity"`
	RiskFit   float64 `json:"riskFit"`
	Outlook   float64 `json:"outlook"`
}

// Skipped explains why a watchlist symbol produced nothing.
type Skipped struct {
	Symbol string `json:"symbol"`
	Stage  string `json:"stage"` // universe | chain | suitability
	Reason string `json:"reason"`
}

// Pipeline counts what passed each stage of discovery.
type Pipeline struct {
	Watchlist   int `json:"watchlist"`   // 1. universe: symbols considered
	Eligible    int `json:"eligible"`    //    ... that passed eligibility
	Expiries    int `json:"expiries"`    // 2. chain analysis: expiries explored
	Contracts   int `json:"contracts"`   //    ... usable contracts priced
	Candidates  int `json:"candidates"`  // 3. trades generated for the approach
	Evaluated   int `json:"evaluated"`   // 4. with a valid payoff and collateral
	Suitable    int `json:"suitable"`    // 5. that fit the campaign
	Recommended int `json:"recommended"` // 6. ranked and shown
}

// Result of one scan.
type Result struct {
	Opportunities []Opportunity `json:"opportunities"`
	Scanned       int           `json:"scanned"`
	Evaluated     int           `json:"evaluated"` // candidate trades scored
	Skipped       []Skipped     `json:"skipped"`
	DataQuality   string        `json:"dataQuality"` // live | last-trade | none
	Pipeline      Pipeline      `json:"pipeline"`
}

var strategyLabels = map[string]string{
	"covered_call": "Covered Call", "csp": "Cash-Secured Put", "iron_condor": "Iron Condor",
	"straddle": "Short Straddle", "strangle": "Short Strangle",
}

// holding windows in days to expiry, with a preferred point.
var holdingWindows = map[string][3]float64{
	"intraday": {0, 2, 0.5}, "1-7d": {1, 8, 5}, "1-4w": {7, 31, 21}, "1m+": {28, 63, 45},
}

// delta bands for short OTM strikes by risk: min, max, target |delta|.
var deltaBands = map[string][3]float64{
	"low": {0.06, 0.18, 0.12}, "moderate": {0.14, 0.30, 0.22}, "high": {0.24, 0.42, 0.32},
}

// share of campaign capital one idea may use comfortably.
var capitalCaps = map[string]float64{"low": 0.15, "moderate": 0.25, "high": 0.40}

const maxResults = 25

// Engine turns option chains into ranked opportunities.
type Engine struct {
	Source ChainSource
	Now    func() time.Time
}

func (e *Engine) now() time.Time {
	if e.Now != nil {
		return e.Now()
	}
	return time.Now()
}

// Discover scans every ticker for every strategy in the approach.
func (e *Engine) Discover(ctx context.Context, in Input) Result {
	in = withDefaults(in)
	res := Result{Opportunities: []Opportunity{}, Skipped: []Skipped{}, DataQuality: "none"}
	type out struct {
		opps    []Opportunity
		skip    *Skipped
		stats   symbolStats
		quality string
	}
	results := make([]out, len(in.Tickers))
	sem := make(chan struct{}, 4) // be gentle with the data source
	var wg sync.WaitGroup
	for i, sym := range in.Tickers {
		wg.Add(1)
		go func(i int, sym string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			opps, stats, quality, err := e.scanSymbol(ctx, in, sym)
			o := out{opps: opps, stats: stats, quality: quality}
			var se *stageError
			switch {
			case errors.As(err, &se):
				o.skip = &Skipped{Symbol: sym, Stage: se.stage, Reason: se.msg}
			case err != nil:
				o.skip = &Skipped{Symbol: sym, Stage: "universe", Reason: err.Error()}
			case len(opps) == 0:
				o.skip = &Skipped{Symbol: sym, Stage: "suitability", Reason: "no contract fits the approach and risk limits"}
			}
			results[i] = o
		}(i, sym)
	}
	wg.Wait()

	res.Pipeline.Watchlist = len(in.Tickers)
	for _, o := range results {
		res.Scanned++
		res.Evaluated += o.stats.candidates
		p := &res.Pipeline
		if o.stats.eligible {
			p.Eligible++
		}
		p.Expiries += o.stats.expiries
		p.Contracts += o.stats.contracts
		p.Candidates += o.stats.candidates
		p.Evaluated += o.stats.evaluated
		p.Suitable += o.stats.suitable
		res.Opportunities = append(res.Opportunities, o.opps...)
		if o.skip != nil {
			res.Skipped = append(res.Skipped, *o.skip)
		}
		if o.quality == "live" || (o.quality == "last-trade" && res.DataQuality == "none") {
			res.DataQuality = o.quality
		}
	}
	sort.SliceStable(res.Opportunities, func(i, j int) bool {
		a, b := res.Opportunities[i], res.Opportunities[j]
		// Trades inside the user's risk limits always rank first.
		if a.Decision.WithinLimits != b.Decision.WithinLimits {
			return a.Decision.WithinLimits
		}
		if a.Score != b.Score {
			return a.Score > b.Score
		}
		return a.AnnualizedYield > b.AnnualizedYield
	})
	if len(res.Opportunities) > maxResults {
		res.Opportunities = res.Opportunities[:maxResults]
	}
	for i := range res.Opportunities {
		res.Opportunities[i].Rank = i + 1
		if i == 0 && len(res.Opportunities) > 1 {
			res.Opportunities[i].Reasons = appendReason(res.Opportunities[i].Reasons,
				Reason{"Best idea in this scan", fmt.Sprintf("Ranks #1 of %d opportunities", len(res.Opportunities))})
		}
	}
	res.Pipeline.Recommended = len(res.Opportunities)
	compare(res.Opportunities)
	return res
}

func withDefaults(in Input) Input {
	if len(in.Strategies) == 0 {
		in.Strategies = []string{"covered_call"}
	}
	if _, ok := holdingWindows[in.Holding]; !ok {
		in.Holding = "1-4w"
	}
	if _, ok := deltaBands[in.Risk]; !ok {
		in.Risk = "moderate"
	}
	if in.Moneyness == "" {
		in.Moneyness = "OTM"
	}
	if in.Outlook == "" {
		in.Outlook = "neutral"
	}
	if in.RequiredAnnual <= 0 {
		in.RequiredAnnual = 0.10
	}
	return in
}

// pickExpiries returns up to two expiries inside the holding window, closest
// to its preferred point; if none fall inside, the single closest one.
func pickExpiries(all []time.Time, now time.Time, holding string) (picked []time.Time, inside bool) {
	w := holdingWindows[holding]
	type cand struct {
		t    time.Time
		dist float64
	}
	var in, any []cand
	for _, t := range all {
		dte := daysTo(t, now)
		if dte < 0 {
			continue
		}
		c := cand{t, math.Abs(dte - w[2])}
		any = append(any, c)
		if dte >= w[0] && dte <= w[1] {
			in = append(in, c)
		}
	}
	byDist := func(l []cand) { sort.Slice(l, func(i, j int) bool { return l[i].dist < l[j].dist }) }
	if len(in) > 0 {
		byDist(in)
		for i := 0; i < len(in) && i < 2; i++ {
			picked = append(picked, in[i].t)
		}
		return picked, true
	}
	if len(any) > 0 {
		byDist(any)
		return []time.Time{any[0].t}, false
	}
	return nil, false
}

// expiry moment: Yahoo dates are midnight UTC of the expiry day; options stop
// trading at 16:00 New York, about 20:00-21:00 UTC.
func daysTo(expiry, now time.Time) float64 {
	return expiry.Add(20*time.Hour).Sub(now).Hours() / 24
}

// symbolStats counts one symbol's progress through the pipeline.
type symbolStats struct {
	eligible                                             bool
	expiries, contracts, candidates, evaluated, suitable int
}

type stageError struct{ stage, msg string }

func (e *stageError) Error() string { return e.msg }

const minUnderlyingPrice = 5.0

// eligible is stage 1: can this campaign trade options on the symbol at all?
func eligible(ch Chain, in Input) error {
	if ch.Price < minUnderlyingPrice {
		return &stageError{"universe", fmt.Sprintf("share price %s is below %s; its options are too thin", money(ch.Price), money(minUnderlyingPrice))}
	}
	if in.Capital <= 0 {
		return nil
	}
	// Rough collateral for one contract of the cheapest selected strategy.
	cheapest := math.Inf(1)
	for _, s := range in.Strategies {
		need := ch.Price * 100 // covered call shares, cash-secured put
		switch s {
		case "strangle", "straddle":
			need = ch.Price * 100 * 0.2
		case "iron_condor":
			need = ch.Price * 100 * 0.05
		}
		cheapest = math.Min(cheapest, need*0.9)
	}
	if cheapest > in.Capital {
		return &stageError{"universe", fmt.Sprintf("one contract needs about %s, more than the campaign's %s capital", money(math.Round(cheapest)), money(in.Capital))}
	}
	return nil
}

func (e *Engine) scanSymbol(ctx context.Context, in Input, sym string) ([]Opportunity, symbolStats, string, error) {
	var st symbolStats
	first, err := e.Source.Chain(ctx, sym, time.Time{})
	if err != nil {
		if err == ErrNoChain {
			return nil, st, "", &stageError{"universe", "no listed options"}
		}
		return nil, st, "", &stageError{"universe", "option data unavailable"}
	}
	if err := eligible(first, in); err != nil {
		return nil, st, "", err
	}
	now := e.now()
	expiries, inside := pickExpiries(first.Expirations, now, in.Holding)
	if len(expiries) == 0 {
		return nil, st, "", &stageError{"universe", "no upcoming expiries"}
	}
	st.eligible = true
	best := map[string]Opportunity{}
	tried := map[string]int{}
	quality := ""
	for _, exp := range expiries {
		ch := first
		if !first.Expiration.Equal(exp) {
			if ch, err = e.Source.Chain(ctx, sym, exp); err != nil {
				continue
			}
		}
		pc := prepare(ch, now)
		st.expiries++
		st.contracts += len(pc.calls) + len(pc.puts)
		if pc.quality == "live" || quality == "" {
			quality = pc.quality
		}
		for _, strat := range in.Strategies {
			for _, o := range build(strat, in, pc) {
				st.candidates++
				switch finish(&o, in, pc, inside) {
				case "risk":
					continue
				case "suitability":
					st.evaluated++
					continue
				}
				st.evaluated++
				st.suitable++
				tried[strat]++
				if cur, ok := best[strat]; !ok || o.Score > cur.Score {
					best[strat] = o
				}
			}
		}
	}
	if st.expiries == 0 {
		return nil, st, "", &stageError{"chain", "option chains for the holding window are unavailable"}
	}
	var out []Opportunity
	for strat, o := range best {
		o.Decision.Comparison.Alternatives = tried[strat] - 1
		out = append(out, o)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].StrategyKey < out[j].StrategyKey })
	return out, st, quality, nil
}

// quote is a cleaned option with Greeks.
type quote struct {
	c       Contract
	call    bool
	mid     float64
	iv      float64
	delta   float64
	theta   float64
	spread  float64 // fraction of mid
	derived bool    // IV solved from the price, not quoted
	live    bool
	usable  bool
}

type preparedChain struct {
	sym         string
	S           float64
	T           float64 // years
	dte         float64
	expiry      time.Time
	calls, puts []quote // sorted by strike
	earnings    time.Time
	exDiv       time.Time
	quality     string
}

// prepare filters a chain to usable contracts and fills in Greeks. Before the
// open Yahoo reports bid/ask 0 and IV ~0, so the last trade is used and the
// volatility re-derived from it.
func prepare(ch Chain, now time.Time) preparedChain {
	dte := daysTo(ch.Expiration, now)
	pc := preparedChain{sym: ch.Symbol, S: ch.Price, dte: dte, T: math.Max(dte, 1.0/24) / 365,
		expiry: ch.Expiration, earnings: ch.Earnings, exDiv: ch.ExDividend}
	liveCount, lastCount := 0, 0
	mk := func(c Contract, call bool) quote {
		q := quote{c: c, call: call}
		switch {
		case c.Bid > 0 && c.Ask >= c.Bid:
			q.mid, q.live = (c.Bid+c.Ask)/2, true
			q.spread = (c.Ask - c.Bid) / q.mid
		case c.LastPrice > 0:
			q.mid = c.LastPrice
		default:
			return q
		}
		q.iv = c.IV
		if !q.live || q.iv < 0.02 || q.iv > 4 {
			iv, ok := ImpliedVol(call, pc.S, c.Strike, pc.T, q.mid)
			if !ok {
				return q
			}
			q.iv, q.derived = iv, true
		}
		if q.live && q.spread > 0.5 {
			return q // too wide to trade sensibly
		}
		q.delta = Delta(call, pc.S, c.Strike, pc.T, q.iv)
		q.theta = Theta(call, pc.S, c.Strike, pc.T, q.iv)
		q.usable = true
		if q.live {
			liveCount++
		} else {
			lastCount++
		}
		return q
	}
	for _, c := range ch.Calls {
		if q := mk(c, true); q.usable {
			pc.calls = append(pc.calls, q)
		}
	}
	for _, c := range ch.Puts {
		if q := mk(c, false); q.usable {
			pc.puts = append(pc.puts, q)
		}
	}
	sort.Slice(pc.calls, func(i, j int) bool { return pc.calls[i].c.Strike < pc.calls[j].c.Strike })
	sort.Slice(pc.puts, func(i, j int) bool { return pc.puts[i].c.Strike < pc.puts[j].c.Strike })
	switch {
	case liveCount > 0:
		pc.quality = "live"
	case lastCount > 0:
		pc.quality = "last-trade"
	default:
		pc.quality = "none"
	}
	return pc
}

// shortCandidates are strikes for a short leg: OTM by delta band, ATM by
// nearest strike, ITM by a 0.55-0.75 delta band. Outlook nudges the target:
// bullish sells puts closer and calls further, bearish the reverse.
func shortCandidates(list []quote, S float64, moneyness, risk, outlook string, call bool) []quote {
	if len(list) == 0 {
		return nil
	}
	if moneyness == "ATM" {
		sorted := append([]quote(nil), list...)
		sort.Slice(sorted, func(i, j int) bool {
			return math.Abs(sorted[i].c.Strike-S) < math.Abs(sorted[j].c.Strike-S)
		})
		if len(sorted) > 2 {
			sorted = sorted[:2]
		}
		return sorted
	}
	band := deltaBands[risk]
	if moneyness == "ITM" {
		band = [3]float64{0.55, 0.75, 0.62}
	}
	shift := 0.0
	if outlook == "bullish" {
		shift = map[bool]float64{true: -0.03, false: 0.03}[call]
	} else if outlook == "bearish" {
		shift = map[bool]float64{true: 0.03, false: -0.03}[call]
	}
	target := band[2] + shift
	var in []quote
	for _, q := range list {
		d := math.Abs(q.delta)
		if d >= band[0] && d <= band[1] {
			in = append(in, q)
		}
	}
	sort.Slice(in, func(i, j int) bool {
		return math.Abs(math.Abs(in[i].delta)-target) < math.Abs(math.Abs(in[j].delta)-target)
	})
	if len(in) > 3 {
		in = in[:3]
	}
	return in
}

func leg(action string, q quote) Leg {
	t := "put"
	if q.call {
		t = "call"
	}
	return Leg{Action: action, Type: t, Strike: q.c.Strike, Premium: round2(q.mid), Delta: round2(q.delta),
		IV: round1(q.iv * 100), Contract: q.c.Symbol}
}

// build returns candidate trades for one strategy (unscored).
func build(strat string, in Input, pc preparedChain) []Opportunity {
	S := pc.S
	base := func(legs []quote) Opportunity {
		o := Opportunity{Symbol: pc.sym, StrategyKey: strat, Strategy: strategyLabels[strat], Price: round2(S),
			Expiry: pc.expiry.Format("2006-01-02"), ExpiryDays: int(math.Max(0, math.Round(pc.dte)))}
		var spread, ivSum float64
		n := 0
		o.PriceSource, o.IVSource = "live", "market"
		for _, q := range legs {
			if !q.live {
				o.PriceSource = "last-trade"
			}
			if q.derived {
				o.IVSource = "derived"
			}
			spread = math.Max(spread, q.spread)
			o.OpenInterest += q.c.OpenInterest
			o.Volume += q.c.Volume
			ivSum += q.iv
			n++
		}
		o.SpreadPct = round1(spread * 100)
		o.IV = round1(ivSum / float64(n) * 100)
		return o
	}
	var out []Opportunity
	switch strat {
	case "covered_call", "csp":
		call := strat == "covered_call"
		list := pc.puts
		if call {
			list = pc.calls
		}
		for _, q := range shortCandidates(list, S, in.Moneyness, in.Risk, in.Outlook, call) {
			o := base([]quote{q})
			o.Legs = []Leg{leg("sell", q)}
			o.Strike = q.c.Strike
			o.StrikeText = money(q.c.Strike)
			o.Premium = round2(q.mid * 100)
			o.Theta = round2(-q.theta * 100)
			if call {
				o.Description = fmt.Sprintf("Sell 1x %s %s Call", pc.sym, money(q.c.Strike))
				o.Collateral = fmt.Sprintf("100 %s shares (%s)", pc.sym, money(S*100))
				o.CapitalRequired = round2(S * 100)
				o.Breakeven = round2(S - q.mid)
				o.Delta = round2(1 - q.delta)
				// The shares are already held, so the question is whether the
				// call expires worthless and the whole premium is kept.
				o.POP = ProbOTM(true, S, q.c.Strike, pc.T, q.iv)
				o.MaxRisk = ptr(round2((S - q.mid) * 100))
				o.MaxRiskText = fmt.Sprintf("If %s falls below %s; upside capped at %s", pc.sym, money(o.Breakeven), money(q.c.Strike))
			} else {
				o.Description = fmt.Sprintf("Sell 1x %s %s Put", pc.sym, money(q.c.Strike))
				o.Collateral = fmt.Sprintf("%s cash secured", money(q.c.Strike*100))
				o.CapitalRequired = round2(q.c.Strike*100 - q.mid*100)
				o.Breakeven = round2(q.c.Strike - q.mid)
				o.Delta = round2(-q.delta)
				o.POP = ProbOTM(false, S, o.Breakeven, pc.T, q.iv)
				o.MaxRisk = ptr(round2(o.Breakeven * 100))
				o.MaxRiskText = fmt.Sprintf("If %s closes below %s you buy 100 shares at %s", pc.sym, money(o.Breakeven), money(q.c.Strike))
			}
			out = append(out, o)
		}

	case "strangle", "straddle":
		var pairs [][2]quote
		if strat == "straddle" {
			for _, c := range shortCandidates(pc.calls, S, "ATM", in.Risk, in.Outlook, true) {
				for _, p := range pc.puts {
					if p.c.Strike == c.c.Strike {
						pairs = append(pairs, [2]quote{p, c})
					}
				}
			}
		} else {
			m := in.Moneyness
			if m != "OTM" {
				m = "OTM" // a strangle is OTM by definition
			}
			ps := shortCandidates(pc.puts, S, m, in.Risk, in.Outlook, false)
			cs := shortCandidates(pc.calls, S, m, in.Risk, in.Outlook, true)
			for i := 0; i < len(ps) && i < 2; i++ {
				for j := 0; j < len(cs) && j < 2; j++ {
					if ps[i].c.Strike < cs[j].c.Strike {
						pairs = append(pairs, [2]quote{ps[i], cs[j]})
					}
				}
			}
		}
		for _, pr := range pairs {
			p, c := pr[0], pr[1]
			o := base([]quote{p, c})
			credit := p.mid + c.mid
			o.Legs = []Leg{leg("sell", p), leg("sell", c)}
			o.Strike = c.c.Strike
			if strat == "straddle" {
				o.StrikeText = money(c.c.Strike)
				o.Description = fmt.Sprintf("Sell 1x %s %s Put + 1x %s Call", pc.sym, money(p.c.Strike), money(c.c.Strike))
			} else {
				o.StrikeText = money(p.c.Strike) + " / " + money(c.c.Strike)
				o.Description = fmt.Sprintf("Sell 1x %s %s Put + 1x %s Call", pc.sym, money(p.c.Strike), money(c.c.Strike))
			}
			o.Premium = round2(credit * 100)
			o.Theta = round2(-(p.theta + c.theta) * 100)
			o.CapitalRequired = round2(nakedMargin(S, p, c) * 100)
			o.Collateral = fmt.Sprintf("%s margin (estimate)", money(o.CapitalRequired))
			o.Breakeven = round2(p.c.Strike - credit)
			o.BreakevenHigh = round2(c.c.Strike + credit)
			o.Delta = round2(-(p.delta + c.delta))
			o.POP = ProbBetween(S, o.Breakeven, o.BreakevenHigh, pc.T, (p.iv+c.iv)/2)
			o.MaxRiskText = fmt.Sprintf("Unlimited above %s; large below %s", money(o.BreakevenHigh), money(o.Breakeven))
			out = append(out, o)
		}

	case "iron_condor":
		ps := shortCandidates(pc.puts, S, "OTM", in.Risk, in.Outlook, false)
		cs := shortCandidates(pc.calls, S, "OTM", in.Risk, in.Outlook, true)
		if len(ps) == 0 || len(cs) == 0 {
			return nil
		}
		width := math.Max(S*0.05, 1)
		p, c := ps[0], cs[0]
		lp, ok1 := nearestStrike(pc.puts, p.c.Strike-width, func(k float64) bool { return k < p.c.Strike })
		lc, ok2 := nearestStrike(pc.calls, c.c.Strike+width, func(k float64) bool { return k > c.c.Strike })
		if !ok1 || !ok2 || p.c.Strike >= c.c.Strike {
			return nil
		}
		credit := p.mid + c.mid - lp.mid - lc.mid
		if credit <= 0 {
			return nil
		}
		w := math.Max(p.c.Strike-lp.c.Strike, lc.c.Strike-c.c.Strike)
		o := base([]quote{p, c, lp, lc})
		o.Legs = []Leg{leg("buy", lp), leg("sell", p), leg("sell", c), leg("buy", lc)}
		o.Strike = c.c.Strike
		o.StrikeText = fmt.Sprintf("%s / %s", money(p.c.Strike), money(c.c.Strike))
		o.Description = fmt.Sprintf("Sell %s %s/%s Put spread + %s/%s Call spread", pc.sym,
			money(p.c.Strike), money(lp.c.Strike), money(c.c.Strike), money(lc.c.Strike))
		o.Premium = round2(credit * 100)
		o.Theta = round2(-(p.theta + c.theta - lp.theta - lc.theta) * 100)
		o.CapitalRequired = round2(w*100 - credit*100)
		o.Collateral = fmt.Sprintf("%s defined-risk margin", money(o.CapitalRequired))
		o.MaxRisk = ptr(o.CapitalRequired)
		o.MaxRiskText = fmt.Sprintf("If %s closes below %s or above %s", pc.sym, money(lp.c.Strike), money(lc.c.Strike))
		o.Breakeven = round2(p.c.Strike - credit)
		o.BreakevenHigh = round2(c.c.Strike + credit)
		o.Delta = round2(-(p.delta + c.delta - lp.delta - lc.delta))
		o.POP = ProbBetween(S, o.Breakeven, o.BreakevenHigh, pc.T, (p.iv+c.iv)/2)
		out = append(out, o)
	}
	return out
}

// nakedMargin approximates the Reg-T requirement for a short strangle per
// share: the larger side's requirement plus the other side's premium.
func nakedMargin(S float64, p, c quote) float64 {
	putReq := p.mid + math.Max(0.20*S-math.Max(0, S-p.c.Strike), 0.10*p.c.Strike)
	callReq := c.mid + math.Max(0.20*S-math.Max(0, c.c.Strike-S), 0.10*S)
	if putReq > callReq {
		return putReq + c.mid
	}
	return callReq + p.mid
}

func nearestStrike(list []quote, target float64, ok func(float64) bool) (quote, bool) {
	var best quote
	found := false
	for _, q := range list {
		if !ok(q.c.Strike) {
			continue
		}
		if !found || math.Abs(q.c.Strike-target) < math.Abs(best.c.Strike-target) {
			best, found = q, true
		}
	}
	return best, found
}

var outlookFit = map[string]map[string]float64{
	"covered_call": {"bullish": 0.8, "neutral": 1, "bearish": 0.35},
	"csp":          {"bullish": 1, "neutral": 0.8, "bearish": 0.2},
	"iron_condor":  {"bullish": 0.6, "neutral": 1, "bearish": 0.6},
	"strangle":     {"bullish": 0.6, "neutral": 1, "bearish": 0.6},
	"straddle":     {"bullish": 0.45, "neutral": 1, "bearish": 0.45},
}

// finish runs stages 4-5 on a candidate: risk and reward, then campaign
// suitability and the explanation. It returns "" when the trade passes, or the
// stage that rejected it ("risk" | "suitability").
func finish(o *Opportunity, in Input, pc preparedChain, expiryInWindow bool) string {
	o.ID = fmt.Sprintf("%s-%s-%s-%s", strings.ToLower(o.Symbol), o.StrategyKey, strings.ReplaceAll(o.Expiry, "-", ""),
		strings.NewReplacer(".", "_", " ", "", "/", "-", "$", "").Replace(o.StrikeText))
	o.POP = round1(o.POP * 100)
	o.Reasons, o.Warnings = []Reason{}, []string{}
	if o.Premium <= 0 || o.CapitalRequired <= 0 {
		return "risk"
	}
	riskReward(o)
	if in.Capital > 0 && o.CapitalRequired > in.Capital {
		return "suitability" // doesn't fit the campaign at all
	}
	days := math.Max(pc.dte, 0.5)
	o.ReturnPct = round2(o.Premium / o.CapitalRequired * 100)
	o.AnnualizedYield = round1(o.Premium / o.CapitalRequired * 365 / days * 100)

	// Sizing: as many contract sets as fit the risk level's capital share.
	capCap := capitalCaps[in.Risk]
	o.Contracts = 1
	if in.Capital > 0 {
		o.Contracts = int(math.Max(1, math.Min(20, math.Floor(in.Capital*capCap/o.CapitalRequired))))
		o.CapitalUsePct = round1(o.CapitalRequired * float64(o.Contracts) / in.Capital * 100)
	}
	o.TotalPremium = round2(o.Premium * float64(o.Contracts))
	if rem := in.NetTarget - in.Earned; rem > 0 {
		o.GoalContributionPct = round1(o.TotalPremium / rem * 100)
	}
	if in.WeeklyTarget > 0 {
		o.WeeklyContributionPct = round1(o.TotalPremium * 7 / math.Max(days, 7) / in.WeeklyTarget * 100)
	}

	// Events before expiry.
	if !pc.earnings.IsZero() && pc.earnings.After(e0(pc)) && !pc.earnings.After(pc.expiry.Add(20*time.Hour)) {
		o.EarningsBeforeExpiry = true
	}
	// Only upcoming events matter to a new trade.
	today := e0(pc).Truncate(24 * time.Hour)
	if !pc.earnings.IsZero() && !pc.earnings.Before(today) {
		o.Earnings = pc.earnings.Format("2006-01-02")
	}
	if !pc.exDiv.IsZero() && !pc.exDiv.Before(today) {
		o.ExDividend = pc.exDiv.Format("2006-01-02")
	}
	if o.EarningsBeforeExpiry && in.Risk == "low" {
		return "suitability" // low-risk campaigns avoid earnings gaps
	}

	// Sub-scores.
	f := Factors{}
	f.GoalFit = clamp01(o.AnnualizedYield / 100 / in.RequiredAnnual)
	f.Profit = clamp01((o.POP - 50) / 40)
	if o.PriceSource == "live" {
		oi := clamp01(math.Log10(float64(o.OpenInterest)+1) / 3)
		f.Liquidity = clamp01(1-o.SpreadPct/30)*0.6 + oi*0.4
	} else {
		f.Liquidity = 0.3
	}
	f.RiskFit = 1
	if o.CapitalUsePct/100 > capCap {
		f.RiskFit = clamp01(1 - (o.CapitalUsePct/100-capCap)/capCap)
	}
	if o.MaxRisk == nil {
		f.RiskFit *= map[string]float64{"low": 0.3, "moderate": 0.65, "high": 0.9}[in.Risk]
	}
	if o.EarningsBeforeExpiry {
		f.RiskFit *= 0.5
	}
	f.Outlook = outlookFit[o.StrategyKey][in.Outlook]
	o.Factors = Factors{round2(f.GoalFit), round2(f.Profit), round2(f.Liquidity), round2(f.RiskFit), round2(f.Outlook)}
	score := 30*f.GoalFit + 25*f.Profit + 15*f.Liquidity + 15*f.RiskFit + 15*f.Outlook
	o.Score = int(math.Max(1, math.Round(score)))

	o.Weights = factorWeights
	confidence(o, expiryInWindow)
	short := 0.0
	for _, l := range o.Legs {
		if l.Action == "sell" {
			short = math.Max(short, math.Abs(l.Delta))
		}
	}
	switch {
	case o.MaxRisk == nil && short > 0.2, short > 0.4:
		o.RiskLevel = "High"
	case short > 0.22 || o.MaxRisk == nil:
		o.RiskLevel = "Moderate"
	default:
		o.RiskLevel = "Low"
	}

	// Explanation: why the engine picked it.
	req := in.RequiredAnnual * 100
	if f.GoalFit >= 1 {
		o.Reasons = append(o.Reasons, Reason{"Strong fit with your goal",
			fmt.Sprintf("%.1f%% annualized vs %.1f%% your campaign needs", o.AnnualizedYield, req)})
	} else {
		o.Reasons = append(o.Reasons, Reason{"Contributes to your goal",
			fmt.Sprintf("%.1f%% annualized; your campaign needs %.1f%%", o.AnnualizedYield, req)})
	}
	popText := fmt.Sprintf("%.0f%% probability of profit at expiry", o.POP)
	if o.StrategyKey == "covered_call" {
		popText = fmt.Sprintf("%.0f%% chance the call expires worthless and you keep the shares", o.POP)
	}
	switch {
	case o.POP >= 70:
		o.Reasons = append(o.Reasons, Reason{"High chance of keeping the premium", popText})
	case o.POP >= 55:
		o.Reasons = append(o.Reasons, Reason{"Fair chance of keeping the premium", popText})
	}
	if in.Capital > 0 && o.CapitalUsePct <= capCap*100 {
		o.Reasons = append(o.Reasons, Reason{"Risk is within your limits",
			fmt.Sprintf("Uses %.0f%% of campaign capital (%s risk allows %.0f%%)", o.CapitalUsePct, in.Risk, capCap*100)})
	} else if in.Capital > 0 {
		o.Warnings = append(o.Warnings, fmt.Sprintf("One contract uses %.0f%% of campaign capital, above the %.0f%% your %s risk level suggests.",
			o.CapitalUsePct, capCap*100, in.Risk))
	}
	if f.Outlook >= 0.8 {
		o.Reasons = append(o.Reasons, Reason{"Matches your market outlook",
			fmt.Sprintf("%s suits a %s view", o.Strategy, in.Outlook)})
	}
	if o.PriceSource == "live" && o.SpreadPct <= 10 {
		o.Reasons = append(o.Reasons, Reason{"Easy to trade", fmt.Sprintf("%.1f%% bid-ask spread, %d open interest", o.SpreadPct, o.OpenInterest)})
	}
	if o.IV >= 40 {
		o.Reasons = append(o.Reasons, Reason{"Rich premium", fmt.Sprintf("Implied volatility is %.0f%%", o.IV)})
	}
	if f.GoalFit < 0.5 {
		o.Warnings = append(o.Warnings, "Yield is well below the pace your goal needs.")
	}
	if f.Profit < 0.3 {
		o.Warnings = append(o.Warnings, fmt.Sprintf("Only a %.0f%% probability of profit.", o.POP))
	}
	if o.EarningsBeforeExpiry {
		o.Warnings = append(o.Warnings, fmt.Sprintf("Earnings on %s, before expiry: expect a bigger move.", o.Earnings))
	}
	if o.StrategyKey == "covered_call" && o.ExDividend != "" {
		if d, err := time.Parse("2006-01-02", o.ExDividend); err == nil && d.After(e0(pc)) && d.Before(pc.expiry.Add(20*time.Hour)) {
			o.Warnings = append(o.Warnings, "Ex-dividend date before expiry: early assignment is possible.")
		}
	}
	if o.MaxRisk == nil {
		o.Warnings = append(o.Warnings, "Undefined risk: losses are not capped.")
	}
	if o.PriceSource != "live" {
		o.Warnings = append(o.Warnings, "Market closed: priced from the last trade; check live quotes before trading.")
	}
	if !expiryInWindow {
		o.Warnings = append(o.Warnings, "No expiry inside your holding window; using the nearest one.")
	}
	if o.StrategyKey == "covered_call" {
		o.Warnings = append(o.Warnings, fmt.Sprintf("Requires owning 100 %s shares per contract.", o.Symbol))
	}
	if !in.CampaignEndDate.IsZero() && pc.expiry.After(in.CampaignEndDate) {
		o.Warnings = append(o.Warnings, "Expires after your campaign ends.")
	}
	if len(o.Reasons) > 4 {
		o.Reasons = o.Reasons[:4]
	}
	riskChecks(o, in, pc)
	invalidation(o, in)
	disclosures(o)
	suitability(o, in)
	return ""
}

// e0 is "now" for event checks: the chain's expiry minus its days to expiry.
func e0(pc preparedChain) time.Time {
	return pc.expiry.Add(20*time.Hour - time.Duration(pc.dte*24*float64(time.Hour)))
}

func appendReason(list []Reason, r Reason) []Reason {
	if len(list) >= 4 {
		list = list[:3]
	}
	return append(list, r)
}

func clamp01(v float64) float64 { return math.Max(0, math.Min(1, v)) }
func round1(v float64) float64  { return math.Round(v*10) / 10 }
func round2(v float64) float64  { return math.Round(v*100) / 100 }
func ptr(v float64) *float64    { return &v }

// money formats dollars with thousands separators: $25,000 or $357.50.
func money(v float64) string {
	s := fmt.Sprintf("%.2f", math.Abs(v))
	s = strings.TrimSuffix(s, ".00")
	whole, frac, _ := strings.Cut(s, ".")
	for i := len(whole) - 3; i > 0; i -= 3 {
		whole = whole[:i] + "," + whole[i:]
	}
	if frac != "" {
		whole += "." + frac
	}
	if v < 0 {
		return "-$" + whole
	}
	return "$" + whole
}

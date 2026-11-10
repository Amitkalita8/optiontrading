package opportunities

import (
	"fmt"
	"math"
	"strings"
)

// The AI decision layer: everything the detail page needs to answer
//   - Why is this opportunity suitable?          → Reasons, Suitability, Factors
//   - How does it contribute to the goal?        → goal fields on Opportunity
//   - Is the risk within the user's limits?      → RiskChecks, WithinLimits
//   - What makes it better than the others?      → Comparison
//   - What could invalidate the recommendation?  → Invalidation
//
// Score and confidence are different measurements: Score is suitability under
// the scoring framework; Confidence is how reliably the available data
// supports that assessment (quote quality, liquidity, model fit).

type Decision struct {
	Suitability       string     `json:"suitability"` // one-sentence "why suitable"
	ScoreMeaning      string     `json:"scoreMeaning"`
	ConfidenceMeaning string     `json:"confidenceMeaning"`
	WithinLimits      bool       `json:"withinLimits"`
	RiskVerdict       string     `json:"riskVerdict"`
	RiskChecks        []Check    `json:"riskChecks"`
	Invalidation      []Reason   `json:"invalidation"`
	Comparison        Comparison `json:"comparison"`
	ConfidenceFactors []Check    `json:"confidenceFactors"`
	Disclosures       []string   `json:"disclosures"`
}

// Check is one pass/fail test with the figures behind it.
type Check struct {
	Label  string `json:"label"`
	Detail string `json:"detail"`
	Pass   bool   `json:"pass"`
}

// Comparison places the idea among the other ranked candidates.
type Comparison struct {
	Rank         int      `json:"rank"`
	Of           int      `json:"of"`
	Percentile   int      `json:"percentile"`   // share of other ideas it outranks
	Alternatives int      `json:"alternatives"` // other strikes/expiries tried for this symbol + strategy
	Beats        *Peer    `json:"beats"`        // the idea ranked just below
	BeatsOn      []string `json:"beatsOn"`
	Behind       *Peer    `json:"behind"` // the idea ranked just above
	BehindOn     []string `json:"behindOn"`
	Summary      string   `json:"summary"`
}

type Peer struct {
	ID       string `json:"id"`
	Rank     int    `json:"rank"`
	Symbol   string `json:"symbol"`
	Strategy string `json:"strategy"`
	Score    int    `json:"score"`
}

// PayoffPoint is profit/loss at expiry, per contract set, at an underlying price.
type PayoffPoint struct {
	Price float64 `json:"price"`
	PnL   float64 `json:"pnl"`
}

// Factor weights of the score (sum 100), exposed for the breakdown.
var factorWeights = map[string]int{"goalFit": 30, "probability": 25, "liquidity": 15, "riskFit": 15, "outlook": 15}

// minimum probability of profit each risk level expects.
var popFloors = map[string]float64{"low": 75, "moderate": 65, "high": 55}

// pnlAt is the expiry profit/loss of the trade at price P.
func pnlAt(o *Opportunity, P float64) float64 {
	pnl := o.Premium
	for _, l := range o.Legs {
		intrinsic := math.Max(0, P-l.Strike)
		if l.Type == "put" {
			intrinsic = math.Max(0, l.Strike-P)
		}
		if l.Action == "sell" {
			pnl -= intrinsic * 100
		} else {
			pnl += intrinsic * 100
		}
	}
	if o.StrategyKey == "covered_call" {
		pnl += (P - o.Price) * 100 // the shares held
	}
	return pnl
}

// riskReward fills max profit, return on risk and the payoff curve.
func riskReward(o *Opportunity) {
	S := o.Price
	o.MaxProfit = o.Premium
	if o.StrategyKey == "covered_call" {
		o.MaxProfit = round2(o.Premium + (o.Strike-S)*100)
	}
	if o.MaxRisk != nil && *o.MaxRisk > 0 {
		o.ReturnOnRisk = ptr(round1(o.MaxProfit / *o.MaxRisk * 100))
	}
	lo, hi := S*0.8, S*1.2
	for _, l := range o.Legs {
		lo, hi = math.Min(lo, l.Strike*0.95), math.Max(hi, l.Strike*1.05)
	}
	if o.Breakeven > 0 {
		lo = math.Min(lo, o.Breakeven*0.95)
	}
	if o.BreakevenHigh > 0 {
		hi = math.Max(hi, o.BreakevenHigh*1.05)
	}
	const n = 40
	o.Payoff = make([]PayoffPoint, 0, n+1)
	for i := 0; i <= n; i++ {
		P := lo + (hi-lo)*float64(i)/n
		o.Payoff = append(o.Payoff, PayoffPoint{round2(P), round2(pnlAt(o, P))})
	}
}

// confidence rates how well the data supports the analysis (not suitability).
func confidence(o *Opportunity, expiryInWindow bool) {
	var checks []Check
	add := func(weight, value float64, label, detail string, pass bool) float64 {
		checks = append(checks, Check{label, detail, pass})
		return weight * value
	}
	total := 0.0
	if o.PriceSource == "live" {
		total += add(0.30, 1, "Live quotes", "Priced from the current bid and ask", true)
		total += add(0.20, clamp01(1-o.SpreadPct/20), "Tight market",
			fmt.Sprintf("%.1f%% bid-ask spread", o.SpreadPct), o.SpreadPct <= 10)
	} else {
		total += add(0.30, 0.35, "Live quotes", "Market closed: priced from the last trade", false)
		total += add(0.20, 0.4, "Tight market", "Spread unknown until the market opens", false)
	}
	depth := clamp01(math.Log10(float64(o.OpenInterest)+1) / 3)
	total += add(0.20, depth, "Market depth", fmt.Sprintf("%d open interest, %d traded today", o.OpenInterest, o.Volume), o.OpenInterest >= 100)
	if o.IVSource == "market" {
		total += add(0.15, 1, "Volatility from the market", fmt.Sprintf("Implied volatility %.0f%% quoted by the exchange feed", o.IV), true)
	} else {
		total += add(0.15, 0.6, "Volatility from the market", fmt.Sprintf("Implied volatility %.0f%% re-derived from the last price", o.IV), false)
	}
	model := 1.0
	detail := "Black-Scholes estimates hold reasonably over this period"
	if o.EarningsBeforeExpiry {
		model, detail = 0.55, "Earnings before expiry: price jumps break the model's assumptions"
	} else if !expiryInWindow {
		model, detail = 0.75, "Expiry outside your holding window"
	}
	total += add(0.15, model, "Model fit", detail, model == 1)

	o.ConfidencePct = int(math.Round(total * 100))
	switch {
	case o.ConfidencePct >= 75:
		o.Confidence = "High"
	case o.ConfidencePct >= 50:
		o.Confidence = "Medium"
	default:
		o.Confidence = "Low"
	}
	o.Decision.ConfidenceFactors = checks
}

// riskChecks tests the trade against the campaign's risk preferences.
func riskChecks(o *Opportunity, in Input, pc preparedChain) {
	capCap := capitalCaps[in.Risk] * 100
	band := deltaBands[in.Risk]
	bandLabel := fmt.Sprintf("%.2f–%.2f", band[0], band[1])
	switch in.Moneyness {
	case "ITM":
		band, bandLabel = [3]float64{0.55, 0.75, 0.62}, "0.55–0.75 (ITM)"
	case "ATM":
		band, bandLabel = [3]float64{0.35, 0.65, 0.5}, "near 0.50 (ATM)"
	}
	if o.StrategyKey == "straddle" {
		band, bandLabel = [3]float64{0.35, 0.65, 0.5}, "near 0.50 (straddles sell ATM)"
	}
	short := 0.0
	for _, l := range o.Legs {
		if l.Action == "sell" {
			short = math.Max(short, math.Abs(l.Delta))
		}
	}
	floor := popFloors[in.Risk]
	var c []Check
	c = append(c, Check{"Capital use", fmt.Sprintf("%.0f%% of campaign capital; %s risk allows %.0f%%", o.CapitalUsePct, in.Risk, capCap),
		o.CapitalUsePct <= capCap+0.05})
	c = append(c, Check{"Strike distance", fmt.Sprintf("Short delta %.2f; your %s approach targets %s", short, in.Risk, bandLabel),
		short >= band[0]-0.02 && short <= band[1]+0.02})
	c = append(c, Check{"Probability of profit", fmt.Sprintf("%.0f%%; %s risk expects at least %.0f%%", o.POP, in.Risk, floor), o.POP >= floor})
	if o.MaxRisk == nil {
		c = append(c, Check{"Maximum loss", "Not capped (naked short call)", in.Risk == "high"})
	} else {
		c = append(c, Check{"Maximum loss", fmt.Sprintf("Capped at %s per contract", money(*o.MaxRisk)), true})
	}
	if o.EarningsBeforeExpiry {
		c = append(c, Check{"Earnings", "Reports on " + o.Earnings + ", before expiry", false})
	} else {
		c = append(c, Check{"Earnings", "No earnings before expiry", true})
	}
	if !in.CampaignEndDate.IsZero() {
		ok := !pc.expiry.After(in.CampaignEndDate)
		d := "Expires before the campaign ends"
		if !ok {
			d = "Expires after the campaign ends"
		}
		c = append(c, Check{"Campaign timeline", d, ok})
	}
	o.Decision.RiskChecks = c
	var failed []string
	for _, x := range c {
		if !x.Pass {
			failed = append(failed, strings.ToLower(x.Label))
		}
	}
	o.Decision.WithinLimits = len(failed) == 0
	if o.Decision.WithinLimits {
		o.Decision.RiskVerdict = fmt.Sprintf("Within your %s risk limits on all %d checks.", in.Risk, len(c))
	} else {
		o.Decision.RiskVerdict = fmt.Sprintf("Outside your %s limits on %s.", in.Risk, strings.Join(failed, ", "))
	}
}

// invalidation lists the concrete conditions that would void the idea.
func invalidation(o *Opportunity, in Input) {
	var out []Reason
	add := func(t, d string) { out = append(out, Reason{t, d}) }
	sym := o.Symbol
	switch o.StrategyKey {
	case "csp":
		add(fmt.Sprintf("%s falls below %s", sym, money(o.Strike)), "The put moves in the money and assignment of 100 shares per contract becomes likely.")
		add(fmt.Sprintf("%s closes below %s at expiry", sym, money(o.Breakeven)), "Below the breakeven the trade loses money.")
	case "covered_call":
		add(fmt.Sprintf("%s rises above %s", sym, money(o.Strike)), "Your shares are likely to be called away; gains above the strike are given up.")
		add(fmt.Sprintf("%s falls below %s", sym, money(o.Breakeven)), "The premium no longer covers the drop in the shares you hold.")
	case "strangle", "straddle":
		add(fmt.Sprintf("%s leaves %s – %s", sym, money(o.Breakeven), money(o.BreakevenHigh)), "Outside the breakevens the trade loses money, without limit above.")
		add("Volatility rises sharply", "Higher implied volatility raises the cost to close both short options.")
	case "iron_condor":
		add(fmt.Sprintf("%s leaves %s – %s", sym, money(o.Breakeven), money(o.BreakevenHigh)), "Outside the breakevens the trade loses money, up to the capped maximum.")
	}
	// The premium below which the goal pace is no longer met.
	if in.RequiredAnnual > 0 && o.ExpiryDays >= 0 {
		days := math.Max(float64(o.ExpiryDays), 0.5)
		floor := in.RequiredAnnual * o.CapitalRequired * days / 365
		if floor < o.Premium {
			add(fmt.Sprintf("The credit drops below %s", money(math.Ceil(floor))),
				fmt.Sprintf("Below that it no longer meets the %.0f%% a year your goal needs.", in.RequiredAnnual*100))
		}
	}
	if o.PriceSource != "live" {
		add(fmt.Sprintf("%s opens more than 2%% away from %s", sym, money(o.Price)), "Strikes were picked at the last close; a gap changes the risk. Refresh the scan.")
	} else {
		add("The bid-ask spread widens past 10%", "Getting filled would cost too much of the premium.")
	}
	if !o.EarningsBeforeExpiry {
		add("An earnings date lands before "+o.Expiry, "Earnings gaps break the probability estimates.")
	}
	if in.Outlook == "bullish" && (o.StrategyKey == "csp" || o.StrategyKey == "covered_call") {
		add("Your outlook turns bearish", "The trade relies on the price holding up.")
	}
	if in.Outlook == "neutral" && (o.StrategyKey == "strangle" || o.StrategyKey == "straddle" || o.StrategyKey == "iron_condor") {
		add("You expect a big move", "Range strategies need the price to stay put.")
	}
	o.Decision.Invalidation = out
}

func disclosures(o *Opportunity) {
	d := []string{
		"Options involve risk and are not suitable for every investor. This is decision support, not financial advice.",
		"Probabilities and Greeks are Black-Scholes estimates from implied volatility, not guarantees.",
		"Prices are as of the scan time; check live quotes before placing an order.",
	}
	switch o.StrategyKey {
	case "csp":
		d = append(d, "You can be assigned 100 shares per contract at the strike at any time before expiry, and must hold the cash to buy them.")
	case "covered_call":
		d = append(d, "Your shares can be called away at the strike; you keep the full downside of owning the stock.")
	case "strangle", "straddle":
		d = append(d, "The short call has unlimited risk; losses can be many times the premium. Margin requirements can rise.")
	case "iron_condor":
		d = append(d, "Maximum loss is the wing width minus the credit; short legs can be assigned early.")
	}
	o.Decision.Disclosures = d
}

// suitability writes the one-line answer to "why is it suitable?".
func suitability(o *Opportunity, in Input) {
	o.Decision.ScoreMeaning = "Suitability for this campaign: goal fit 30, probability of profit 25, liquidity 15, risk fit 15, outlook fit 15."
	o.Decision.ConfidenceMeaning = "How reliably the data supports the analysis: quote quality, spread, depth, volatility source and model fit."
	verdict := "fits"
	if o.Score < 60 {
		verdict = "partly fits"
	}
	o.Decision.Suitability = fmt.Sprintf("A %s on %s %s your %s, %s-risk campaign: %.1f%% a year against the %.0f%% your goal needs, "+
		"a %.0f%% probability of profit and %.0f%% of capital in use.",
		o.Strategy, o.Symbol, verdict, in.Outlook, in.Risk, o.AnnualizedYield, in.RequiredAnnual*100, o.POP, o.CapitalUsePct)
}

// compare fills each ranked idea's comparison with its neighbours.
func compare(list []Opportunity) {
	n := len(list)
	for i := range list {
		o := &list[i]
		c := &o.Decision.Comparison
		c.Rank, c.Of = i+1, n
		if n > 1 {
			c.Percentile = int(math.Round(float64(n-1-i) / float64(n-1) * 100))
		}
		if i+1 < n {
			b := list[i+1]
			c.Beats = &Peer{b.ID, i + 2, b.Symbol, b.Strategy, b.Score}
			c.BeatsOn = edges(*o, b)
		}
		if i > 0 {
			a := list[i-1]
			c.Behind = &Peer{a.ID, i, a.Symbol, a.Strategy, a.Score}
			c.BehindOn = edges(a, *o)
		}
		switch {
		case n == 1:
			c.Summary = "The only idea that passed every stage of this scan."
		case i == 0 && !o.Decision.WithinLimits:
			c.Summary = fmt.Sprintf("Ranks #1 of %d, but no idea in this scan passes every risk check.", n)
		case i == 0:
			c.Summary = fmt.Sprintf("Ranks #1 of %d: the best balance of goal fit, probability and risk in this scan.", n)
		default:
			c.Summary = fmt.Sprintf("Ranks #%d of %d, ahead of %d%% of the other ideas.", i+1, n, c.Percentile)
		}
		if c.Alternatives > 0 {
			c.Summary += fmt.Sprintf(" Chosen over %d other strike/expiry combinations for %s %s.", c.Alternatives, o.Symbol, strings.ToLower(o.Strategy))
		}
	}
}

// edges lists where a does better than b, biggest factor gap first.
func edges(a, b Opportunity) []string {
	type e struct {
		gap  float64
		text string
	}
	var out []e
	if a.Decision.WithinLimits && !b.Decision.WithinLimits {
		out = append(out, e{100, "stays within your risk limits; the other breaks them (" + failedChecks(b) + ")"})
	}
	if d := a.Factors.GoalFit - b.Factors.GoalFit; d > 0.02 {
		out = append(out, e{d * 30, fmt.Sprintf("better goal fit (%.1f%% vs %.1f%% a year)", a.AnnualizedYield, b.AnnualizedYield)})
	}
	if d := a.Factors.Profit - b.Factors.Profit; d > 0.02 {
		out = append(out, e{d * 25, fmt.Sprintf("higher probability of profit (%.0f%% vs %.0f%%)", a.POP, b.POP)})
	}
	if d := a.Factors.Liquidity - b.Factors.Liquidity; d > 0.02 {
		out = append(out, e{d * 15, fmt.Sprintf("easier to trade (%d vs %d open interest)", a.OpenInterest, b.OpenInterest)})
	}
	if d := a.Factors.RiskFit - b.Factors.RiskFit; d > 0.02 {
		out = append(out, e{d * 15, fmt.Sprintf("fits your risk limits better (%.0f%% vs %.0f%% of capital)", a.CapitalUsePct, b.CapitalUsePct)})
	}
	if d := a.Factors.Outlook - b.Factors.Outlook; d > 0.02 {
		out = append(out, e{d * 15, fmt.Sprintf("%s suits your outlook better than %s", a.Strategy, strings.ToLower(b.Strategy))})
	}
	for i := 1; i < len(out); i++ {
		for j := i; j > 0 && out[j].gap > out[j-1].gap; j-- {
			out[j], out[j-1] = out[j-1], out[j]
		}
	}
	texts := []string{}
	for _, x := range out {
		texts = append(texts, x.text)
	}
	if len(texts) == 0 {
		texts = append(texts, "nearly identical on every factor; ranked on yield")
	}
	return texts
}

func failedChecks(o Opportunity) string {
	var f []string
	for _, c := range o.Decision.RiskChecks {
		if !c.Pass {
			f = append(f, strings.ToLower(c.Label))
		}
	}
	return strings.Join(f, ", ")
}

// Risk-level rules shared with Engine 02 (position monitoring).

// DeltaBand returns the min, max and target |delta| for short strikes.
func DeltaBand(risk string) (min, max, target float64) {
	b, ok := deltaBands[risk]
	if !ok {
		b = deltaBands["moderate"]
	}
	return b[0], b[1], b[2]
}

// CapitalCap is the share of campaign capital one position may use.
func CapitalCap(risk string) float64 {
	if c, ok := capitalCaps[risk]; ok {
		return c
	}
	return capitalCaps["moderate"]
}

// POPFloor is the minimum probability of profit (percent) for the risk level.
func POPFloor(risk string) float64 {
	if f, ok := popFloors[risk]; ok {
		return f
	}
	return popFloors["moderate"]
}

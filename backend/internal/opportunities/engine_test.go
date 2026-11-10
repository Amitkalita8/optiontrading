package opportunities

import (
	"context"
	"math"
	"strings"
	"testing"
	"time"
)

// FakeChains prices every strike with Black-Scholes at a fixed volatility, so
// tests get a realistic, deterministic chain.
type FakeChains struct {
	Prices   map[string]float64
	Vol      float64
	Now      time.Time
	Earnings map[string]time.Time
	LastOnly bool // bid/ask 0 like Yahoo before the open
	Calls    int
}

func (f *FakeChains) Chain(_ context.Context, sym string, expiry time.Time) (Chain, error) {
	f.Calls++
	S, ok := f.Prices[sym]
	if !ok {
		return Chain{}, ErrNoChain
	}
	day := time.Date(f.Now.Year(), f.Now.Month(), f.Now.Day(), 0, 0, 0, 0, time.UTC)
	var exps []time.Time
	for _, d := range []int{3, 10, 17, 24, 38, 52} {
		exps = append(exps, day.AddDate(0, 0, d))
	}
	if expiry.IsZero() {
		expiry = exps[0]
	}
	ch := Chain{Symbol: sym, Price: S, Expiration: expiry, Expirations: exps, Earnings: f.Earnings[sym]}
	T := daysTo(expiry, f.Now) / 365
	step := math.Max(1, math.Round(S*0.025))
	for k := math.Round(S*0.7/step) * step; k <= S*1.3; k += step {
		for _, call := range []bool{true, false} {
			p := Price(call, S, k, T, f.Vol)
			if p < 0.05 {
				continue
			}
			c := Contract{Symbol: sym + "X", Strike: k, LastPrice: p, Volume: 500, OpenInterest: 2000, IV: f.Vol}
			if !f.LastOnly {
				c.Bid, c.Ask = p*0.98, p*1.02
			} else {
				c.IV = 1e-05
			}
			if call {
				ch.Calls = append(ch.Calls, c)
			} else {
				ch.Puts = append(ch.Puts, c)
			}
		}
	}
	return ch, nil
}

var testNow = time.Date(2026, 11, 6, 15, 0, 0, 0, time.UTC)

func baseInput() Input {
	return Input{
		CampaignID: 1, CampaignName: "Test", Tickers: []string{"AAPL", "MSFT", "NOPE"},
		Capital: 100000, NetTarget: 12000, WeeklyTarget: 230, RequiredAnnual: 0.12,
		Strategies: []string{"covered_call", "csp"}, Moneyness: "OTM", Holding: "1-4w", Risk: "moderate", Outlook: "bullish",
	}
}

func TestGreeks(t *testing.T) {
	if d := Delta(true, 100, 100, 30.0/365, 0.3); d < 0.5 || d > 0.56 {
		t.Errorf("ATM call delta = %v", d)
	}
	if d := Delta(false, 100, 90, 30.0/365, 0.3); d > -0.05 || d < -0.2 {
		t.Errorf("OTM put delta = %v", d)
	}
	p := Price(false, 100, 95, 0.1, 0.35)
	if iv, ok := ImpliedVol(false, 100, 95, 0.1, p); !ok || math.Abs(iv-0.35) > 1e-4 {
		t.Errorf("implied vol = %v %v", iv, ok)
	}
	if th := Theta(true, 100, 100, 30.0/365, 0.3); th >= 0 {
		t.Errorf("long call theta should be negative, got %v", th)
	}
	if p := ProbBetween(100, 90, 110, 30.0/365, 0.3); p < 0.6 || p > 0.85 {
		t.Errorf("prob between = %v", p)
	}
}

func TestDiscoverRanksCampaignFits(t *testing.T) {
	src := &FakeChains{Prices: map[string]float64{"AAPL": 200, "MSFT": 400}, Vol: 0.30, Now: testNow}
	e := &Engine{Source: src, Now: func() time.Time { return testNow }}
	res := e.Discover(context.Background(), baseInput())

	if res.Scanned != 3 || len(res.Skipped) != 1 || res.Skipped[0].Symbol != "NOPE" {
		t.Fatalf("scanned %d skipped %+v", res.Scanned, res.Skipped)
	}
	if len(res.Opportunities) != 4 { // 2 symbols × 2 strategies, best contract each
		t.Fatalf("got %d opportunities", len(res.Opportunities))
	}
	if res.DataQuality != "live" {
		t.Errorf("quality = %s", res.DataQuality)
	}
	for i, o := range res.Opportunities {
		if o.Rank != i+1 || (i > 0 && o.Score > res.Opportunities[i-1].Score) {
			t.Errorf("rank order broken at %d", i)
		}
		if o.ExpiryDays < 7 || o.ExpiryDays > 31 {
			t.Errorf("%s expiry %d outside 1-4 weeks", o.ID, o.ExpiryDays)
		}
		short := math.Abs(o.Legs[0].Delta)
		if short < 0.14 || short > 0.30 {
			t.Errorf("%s short delta %v outside moderate band", o.ID, short)
		}
		if o.StrategyKey == "csp" && o.Strike >= o.Price || o.StrategyKey == "covered_call" && o.Strike <= o.Price {
			t.Errorf("%s strike %v not OTM vs %v", o.ID, o.Strike, o.Price)
		}
		if o.POP < 50 || o.Premium <= 0 || o.AnnualizedYield <= 0 || o.Score <= 0 || len(o.Reasons) == 0 {
			t.Errorf("bad metrics: %+v", o)
		}
		if o.CapitalRequired > 100000 || o.Contracts < 1 {
			t.Errorf("sizing: %+v", o)
		}
	}
	// Bullish outlook favours cash-secured puts over covered calls.
	if res.Opportunities[0].StrategyKey != "csp" {
		t.Errorf("top idea = %s, want csp for a bullish view", res.Opportunities[0].StrategyKey)
	}
}

func TestDiscoverMultiLegAndRules(t *testing.T) {
	src := &FakeChains{Prices: map[string]float64{"SPY": 500}, Vol: 0.25, Now: testNow,
		Earnings: map[string]time.Time{"SPY": testNow.AddDate(0, 0, 5)}}
	e := &Engine{Source: src, Now: func() time.Time { return testNow }}
	in := baseInput()
	in.Tickers = []string{"SPY"}
	in.Capital = 1000000
	in.Strategies = []string{"iron_condor", "strangle", "straddle", "covered_call"}
	in.Outlook = "neutral"
	res := e.Discover(context.Background(), in)
	got := map[string]Opportunity{}
	for _, o := range res.Opportunities {
		got[o.StrategyKey] = o
	}
	ic, ok := got["iron_condor"]
	if !ok || len(ic.Legs) != 4 || ic.MaxRisk == nil || *ic.MaxRisk <= 0 || ic.Breakeven >= ic.BreakevenHigh {
		t.Fatalf("iron condor: %+v", ic)
	}
	if st, ok := got["strangle"]; !ok || st.MaxRisk != nil || !strings.Contains(strings.Join(st.Warnings, " "), "Undefined risk") {
		t.Errorf("strangle risk: %+v", st)
	}
	if sd, ok := got["straddle"]; !ok || sd.Legs[0].Strike != sd.Legs[1].Strike {
		t.Errorf("straddle legs: %+v", sd.Legs)
	}
	if !ic.EarningsBeforeExpiry {
		t.Errorf("earnings before expiry not flagged")
	}

	// Low risk drops trades that span earnings; capital too small drops all.
	in.Risk = "low"
	if res := e.Discover(context.Background(), in); len(res.Opportunities) != 0 {
		t.Errorf("low risk kept %d trades through earnings", len(res.Opportunities))
	}
	src.Earnings = nil
	in.Capital = 1000 // SPY covered call needs $50k of shares
	in.Strategies = []string{"covered_call"}
	if res := e.Discover(context.Background(), in); len(res.Opportunities) != 0 {
		t.Errorf("trade larger than the campaign was kept")
	}
}

func TestDiscoverBeforeOpenUsesLastTrade(t *testing.T) {
	src := &FakeChains{Prices: map[string]float64{"AAPL": 200}, Vol: 0.30, Now: testNow, LastOnly: true}
	e := &Engine{Source: src, Now: func() time.Time { return testNow }}
	in := baseInput()
	in.Tickers = []string{"AAPL"}
	res := e.Discover(context.Background(), in)
	if len(res.Opportunities) == 0 || res.DataQuality != "last-trade" {
		t.Fatalf("got %d, quality %s", len(res.Opportunities), res.DataQuality)
	}
	o := res.Opportunities[0]
	if math.Abs(o.IV-30) > 0.5 {
		t.Errorf("re-derived IV = %v, want ~30", o.IV)
	}
	if o.PriceSource != "last-trade" || !strings.Contains(strings.Join(o.Warnings, " "), "last trade") {
		t.Errorf("source %s warnings %v", o.PriceSource, o.Warnings)
	}
}

func TestPickExpiries(t *testing.T) {
	day := time.Date(2026, 11, 6, 0, 0, 0, 0, time.UTC)
	all := []time.Time{day.AddDate(0, 0, 1), day.AddDate(0, 0, 7), day.AddDate(0, 0, 14), day.AddDate(0, 0, 90)}
	got, inside := pickExpiries(all, testNow, "1-4w")
	if !inside || len(got) != 2 || !got[0].Equal(all[2]) {
		t.Errorf("1-4w picked %v", got)
	}
	got, inside = pickExpiries(all[3:], testNow, "1-7d")
	if inside || len(got) != 1 {
		t.Errorf("fallback picked %v inside=%v", got, inside)
	}
}

func TestMoney(t *testing.T) {
	for in, want := range map[float64]string{25000: "$25,000", 357.5: "$357.50", 1234567.891: "$1,234,567.89", 0.5: "$0.50", 999: "$999"} {
		if got := money(in); got != want {
			t.Errorf("money(%v) = %s, want %s", in, got, want)
		}
	}
}

func TestPipelineStages(t *testing.T) {
	src := &FakeChains{Prices: map[string]float64{"AAPL": 200, "MSFT": 400, "PENNY": 3, "BRK": 9000}, Vol: 0.30, Now: testNow}
	e := &Engine{Source: src, Now: func() time.Time { return testNow }}
	in := baseInput()
	in.Capital = 60000
	in.Tickers = []string{"AAPL", "MSFT", "PENNY", "BRK", "NOPE"}
	res := e.Discover(context.Background(), in)
	p := res.Pipeline
	if p.Watchlist != 5 || p.Eligible != 2 {
		t.Fatalf("universe: %+v skipped %+v", p, res.Skipped)
	}
	stages := map[string]string{}
	for _, s := range res.Skipped {
		stages[s.Symbol] = s.Stage + ": " + s.Reason
	}
	if !strings.Contains(stages["PENNY"], "below $5") || !strings.Contains(stages["BRK"], "more than the campaign") ||
		!strings.Contains(stages["NOPE"], "no listed options") {
		t.Errorf("exclusions: %v", stages)
	}
	if !(p.Expiries > 0 && p.Contracts > 0 && p.Candidates >= p.Evaluated && p.Evaluated >= p.Suitable &&
		p.Suitable >= p.Recommended && p.Recommended == len(res.Opportunities) && p.Recommended > 0) {
		t.Errorf("funnel not monotonic: %+v", p)
	}
}

func TestDecisionLayer(t *testing.T) {
	src := &FakeChains{Prices: map[string]float64{"AAPL": 200, "MSFT": 400}, Vol: 0.30, Now: testNow}
	e := &Engine{Source: src, Now: func() time.Time { return testNow }}
	res := e.Discover(context.Background(), baseInput())
	list := res.Opportunities
	top, second := list[0], list[1]
	d := top.Decision

	// Comparison: neighbours and edges.
	if d.Comparison.Rank != 1 || d.Comparison.Of != len(list) || d.Comparison.Percentile != 100 ||
		d.Comparison.Beats == nil || d.Comparison.Beats.ID != second.ID || len(d.Comparison.BeatsOn) == 0 || d.Comparison.Behind != nil {
		t.Errorf("top comparison: %+v", d.Comparison)
	}
	if c := second.Decision.Comparison; c.Behind == nil || c.Behind.ID != top.ID || len(c.BehindOn) == 0 {
		t.Errorf("second comparison: %+v", c)
	}
	if d.Comparison.Alternatives < 1 {
		t.Errorf("alternatives = %d", d.Comparison.Alternatives)
	}

	// Risk checks, invalidation, disclosures, payoff.
	if len(d.RiskChecks) < 5 || d.RiskVerdict == "" || len(d.Invalidation) < 3 || len(d.Disclosures) < 4 || d.Suitability == "" {
		t.Errorf("decision: %+v", d)
	}
	for _, o := range list {
		if o.StrategyKey != "csp" {
			continue
		}
		if o.ReturnOnRisk == nil || o.MaxProfit != o.Premium {
			t.Errorf("csp risk/reward: %+v %v", o.MaxProfit, o.ReturnOnRisk)
		}
		// Payoff: full premium above the strike, zero at breakeven.
		last := o.Payoff[len(o.Payoff)-1]
		if math.Abs(last.PnL-o.Premium) > 0.01 || math.Abs(pnlAt(&o, o.Breakeven)) > 1 {
			t.Errorf("payoff: last %+v breakeven pnl %v", last, pnlAt(&o, o.Breakeven))
		}
		if !strings.Contains(o.Decision.Invalidation[0].Title, "falls below") {
			t.Errorf("csp invalidation: %+v", o.Decision.Invalidation[0])
		}
	}

	// Confidence measures data, not suitability: same trade, last-trade data → lower confidence, same score.
	src2 := &FakeChains{Prices: src.Prices, Vol: 0.30, Now: testNow, LastOnly: true}
	res2 := (&Engine{Source: src2, Now: func() time.Time { return testNow }}).Discover(context.Background(), baseInput())
	var live, last Opportunity
	for _, o := range list {
		if o.Symbol == "AAPL" && o.StrategyKey == "csp" {
			live = o
		}
	}
	for _, o := range res2.Opportunities {
		if o.Symbol == "AAPL" && o.StrategyKey == "csp" {
			last = o
		}
	}
	if last.ConfidencePct >= live.ConfidencePct || live.Confidence != "High" || last.IVSource != "derived" {
		t.Errorf("confidence live %d (%s) vs last-trade %d (iv %s)", live.ConfidencePct, live.Confidence, last.ConfidencePct, last.IVSource)
	}
}

func TestWithinLimitsRankFirst(t *testing.T) {
	// AAPL reports earnings before expiry; MSFT doesn't. Even if AAPL scores
	// higher, MSFT (within limits) must rank above it.
	src := &FakeChains{Prices: map[string]float64{"AAPL": 200, "MSFT": 400}, Vol: 0.30, Now: testNow,
		Earnings: map[string]time.Time{"AAPL": testNow.AddDate(0, 0, 5)}}
	e := &Engine{Source: src, Now: func() time.Time { return testNow }}
	in := baseInput()
	in.Capital = 1000000 // so capital use passes for both
	res := e.Discover(context.Background(), in)
	seenOutside := false
	for _, o := range res.Opportunities {
		if !o.Decision.WithinLimits {
			seenOutside = true
		} else if seenOutside {
			t.Fatalf("%s is within limits but ranked below an idea that is not", o.ID)
		}
	}
	if !seenOutside || !res.Opportunities[0].Decision.WithinLimits {
		t.Errorf("expected AAPL earnings ideas to be outside limits and ranked last")
	}
}

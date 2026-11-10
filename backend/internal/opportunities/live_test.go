//go:build live

package opportunities

import (
	"context"
	"encoding/json"
	"testing"
	"time"
)

// go test -tags live -run Live -v ./internal/opportunities/
func TestLiveYahooScan(t *testing.T) {
	e := &Engine{Source: NewYahoo()}
	in := Input{CampaignName: "Live", Tickers: []string{"AAPL", "MSFT", "NVDA", "SPY"},
		Capital: 100000, NetTarget: 12000, WeeklyTarget: 230, RequiredAnnual: 0.12,
		Strategies: []string{"covered_call", "csp", "iron_condor", "strangle", "straddle"},
		Moneyness:  "OTM", Holding: "1-4w", Risk: "moderate", Outlook: "neutral"}
	start := time.Now()
	res := e.Discover(context.Background(), in)
	t.Logf("%v: scanned %d, evaluated %d, quality %s, skipped %v", time.Since(start).Round(time.Millisecond),
		res.Scanned, res.Evaluated, res.DataQuality, res.Skipped)
	for _, o := range res.Opportunities {
		t.Logf("#%d %-5s %-16s %-14s %s %3dd prem $%7.2f yld %5.1f%% POP %4.1f%% IV %4.1f%% spr %4.1f%% score %d %s",
			o.Rank, o.Symbol, o.Strategy, o.StrikeText, o.Expiry, o.ExpiryDays, o.Premium, o.AnnualizedYield, o.POP, o.IV, o.SpreadPct, o.Score, o.PriceSource)
	}
	if len(res.Opportunities) == 0 {
		t.Fatal("no opportunities from live data")
	}
	b, _ := json.MarshalIndent(struct {
		P Pipeline
		S []Skipped
		D Decision
		C string
	}{res.Pipeline, res.Skipped, res.Opportunities[0].Decision, res.Opportunities[0].Confidence}, "", " ")
	t.Logf("%s", b)
}

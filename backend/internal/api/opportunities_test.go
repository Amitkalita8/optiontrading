package api

import (
	"context"
	"fmt"
	"math"
	"net/url"
	"testing"
	"time"

	"optiontrading/backend/internal/opportunities"
)

// fakeChains serves Black-Scholes-priced chains for AAPL and MSFT only.
type fakeChains struct{}

func (fakeChains) Chain(_ context.Context, sym string, expiry time.Time) (opportunities.Chain, error) {
	S := map[string]float64{"AAPL": 200, "MSFT": 400}[sym]
	if S == 0 {
		return opportunities.Chain{}, opportunities.ErrNoChain
	}
	now := time.Now()
	day := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	var exps []time.Time
	for _, d := range []int{4, 11, 18, 25, 39} {
		exps = append(exps, day.AddDate(0, 0, d))
	}
	if expiry.IsZero() {
		expiry = exps[0]
	}
	ch := opportunities.Chain{Symbol: sym, Price: S, Expiration: expiry, Expirations: exps}
	T := expiry.Add(20*time.Hour).Sub(now).Hours() / 24 / 365
	for k := S * 0.8; k <= S*1.2; k += S * 0.025 {
		k = math.Round(k)
		for _, call := range []bool{true, false} {
			p := opportunities.Price(call, S, k, T, 0.3)
			c := opportunities.Contract{Strike: k, Bid: p * 0.98, Ask: p * 1.02, LastPrice: p, IV: 0.3, OpenInterest: 900, Volume: 50}
			if call {
				ch.Calls = append(ch.Calls, c)
			} else {
				ch.Puts = append(ch.Puts, c)
			}
		}
	}
	return ch, nil
}

func TestOpportunityEngineEndpoints(t *testing.T) {
	srv := newTestServer(t)
	const user = "engine@example.com"
	start := time.Now().AddDate(0, 0, -10).Format("2006-01-02")
	end := time.Now().AddDate(0, 6, 0).Format("2006-01-02")

	// No campaign yet.
	if code, body := call(t, "GET", srv.URL+"/api/opportunities", user, ""); code != 404 || body["code"] != "no_campaign" {
		t.Fatalf("no campaign: %d %v", code, body)
	}

	// Campaign without a watchlist.
	_, c := call(t, "POST", srv.URL+"/api/campaigns", user,
		fmt.Sprintf(`{"name":"Engine","capital":100000,"goal":110000,"status":"active","startDate":%q,"endDate":%q}`, start, end))
	id := c["id"].(float64)
	if code, body := call(t, "GET", fmt.Sprintf("%s/api/campaigns/%v/opportunities", srv.URL, id), user, ""); code != 422 || body["code"] != "no_watchlist" {
		t.Fatalf("no watchlist: %d %v", code, body)
	}

	// Link a watchlist + approach: the scan ranks ideas for it.
	_, wl := call(t, "POST", srv.URL+"/api/watchlists", user, `{"name":"Core","tickers":["AAPL","MSFT","ZZZZ"]}`)
	call(t, "PATCH", fmt.Sprintf("%s/api/campaigns/%v/settings", srv.URL, id), user,
		fmt.Sprintf(`{"watchlistId":%v,"strategies":["csp","covered_call"],"moneyness":"OTM","holdingDuration":"1-4w","risk":"moderate","marketOutlook":"neutral"}`, wl["id"]))

	code, scan := call(t, "GET", srv.URL+"/api/opportunities", user, "")
	if code != 200 {
		t.Fatalf("scan: %d %v", code, scan)
	}
	opps := scan["opportunities"].([]any)
	if len(opps) != 4 || scan["scanned"] != float64(3) || len(scan["skipped"].([]any)) != 1 || scan["watchlist"] != "Core" {
		t.Fatalf("scan: %d opps, %v scanned, skipped %v", len(opps), scan["scanned"], scan["skipped"])
	}
	first := opps[0].(map[string]any)
	if first["rank"] != float64(1) || first["score"].(float64) <= 0 || len(first["reasons"].([]any)) == 0 {
		t.Errorf("top idea: %v", first)
	}
	generated := scan["generatedAt"]

	// Cached until something changes.
	_, again := call(t, "GET", fmt.Sprintf("%s/api/campaigns/%v/opportunities", srv.URL, id), user, "")
	if again["generatedAt"] != generated {
		t.Errorf("expected cached scan")
	}
	// Changing the approach rescans with the new strategy.
	call(t, "PATCH", fmt.Sprintf("%s/api/campaigns/%v/settings", srv.URL, id), user, `{"strategies":["iron_condor"]}`)
	_, changed := call(t, "GET", srv.URL+"/api/opportunities", user, "")
	for _, o := range changed["opportunities"].([]any) {
		if o.(map[string]any)["strategyKey"] != "iron_condor" {
			t.Errorf("after change got %v", o.(map[string]any)["strategyKey"])
		}
	}
	if len(changed["opportunities"].([]any)) == 0 {
		t.Errorf("no iron condors found")
	}
	// Forced refresh.
	if code, _ := call(t, "POST", fmt.Sprintf("%s/api/campaigns/%v/opportunities/refresh", srv.URL, id), user, ""); code != 200 {
		t.Errorf("refresh = %d", code)
	}

	// Detail lookup, scoped to the owner.
	oid := changed["opportunities"].([]any)[0].(map[string]any)["id"].(string)
	code, det := call(t, "GET", srv.URL+"/api/opportunities/"+url.PathEscape(oid), user, "")
	if code != 200 || det["opportunity"].(map[string]any)["id"] != oid || det["campaignName"] != "Engine" {
		t.Errorf("detail: %d %v", code, det)
	}
	if code, _ := call(t, "GET", srv.URL+"/api/opportunities/"+url.PathEscape(oid), "someone@else.com", ""); code != 404 {
		t.Errorf("other user saw the opportunity: %d", code)
	}
	if code, _ := call(t, "GET", fmt.Sprintf("%s/api/campaigns/%v/opportunities", srv.URL, id), "someone@else.com", ""); code != 404 {
		t.Errorf("other user scanned the campaign: %d", code)
	}
}

package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"testing"
)

func call(t *testing.T, method, url, user, body string) (int, map[string]any) {
	t.Helper()
	req, _ := http.NewRequest(method, url, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-Id", user)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var out map[string]any
	json.NewDecoder(res.Body).Decode(&out)
	return res.StatusCode, out
}

func TestDashboardCampaignSwitching(t *testing.T) {
	srv := newTestServer(t)
	const user = "dash@example.com"

	_, wl := call(t, "POST", srv.URL+"/api/watchlists", user, `{"name":"Tech","tickers":["AAPL","MSFT"]}`)
	wlID := wl["id"].(float64)
	_, c1 := call(t, "POST", srv.URL+"/api/campaigns", user,
		fmt.Sprintf(`{"name":"Tech 2026","capital":1000,"goal":1200,"status":"active","startDate":"2026-01-01","endDate":"2026-12-31","watchlistId":%v,"marketOutlook":"bullish"}`, wlID))
	_, c2 := call(t, "POST", srv.URL+"/api/campaigns", user,
		`{"name":"Banks","capital":500,"goal":550,"status":"active","startDate":"2026-01-01","endDate":"2026-06-30"}`)

	// Default: newest campaign.
	code, d := call(t, "GET", srv.URL+"/api/dashboard", user, "")
	if code != 200 || d["campaign"].(map[string]any)["name"] != "Banks" || len(d["campaigns"].([]any)) != 2 {
		t.Fatalf("default dashboard: %d %v", code, d["campaign"])
	}

	// Explicit pick shows that campaign's watchlist and metrics.
	_, d = call(t, "GET", fmt.Sprintf("%s/api/dashboard?campaignId=%v", srv.URL, c1["id"]), user, "")
	camp := d["campaign"].(map[string]any)
	if camp["name"] != "Tech 2026" || camp["marketOutlook"] != "bullish" || d["watchlist"].(map[string]any)["name"] != "Tech" {
		t.Errorf("picked campaign: %v / %v", camp["name"], d["watchlist"])
	}
	if camp["metrics"].(map[string]any)["netTarget"] != float64(200) {
		t.Errorf("metrics: %v", camp["metrics"])
	}

	// Remembered selection.
	if code, _ := call(t, "PUT", srv.URL+"/api/dashboard/active", user, fmt.Sprintf(`{"campaignId":%v}`, c1["id"])); code != 204 {
		t.Fatalf("set active = %d", code)
	}
	if _, d = call(t, "GET", srv.URL+"/api/dashboard", user, ""); d["campaign"].(map[string]any)["name"] != "Tech 2026" {
		t.Errorf("remembered campaign = %v", d["campaign"].(map[string]any)["name"])
	}

	// Links: outlook + watchlist on the other campaign; bad values rejected.
	code, linked := call(t, "PATCH", fmt.Sprintf("%s/api/campaigns/%v/links", srv.URL, c2["id"]), user,
		fmt.Sprintf(`{"watchlistId":%v,"marketOutlook":"Bearish"}`, wlID))
	if code != 200 || linked["marketOutlook"] != "bearish" || linked["watchlistId"] != wlID {
		t.Errorf("links: %d %v", code, linked)
	}
	if code, _ := call(t, "PATCH", fmt.Sprintf("%s/api/campaigns/%v/links", srv.URL, c2["id"]), user, `{"marketOutlook":"sideways"}`); code != 422 {
		t.Errorf("bad outlook = %d, want 422", code)
	}
	if code, _ := call(t, "PATCH", fmt.Sprintf("%s/api/campaigns/%v/links", srv.URL, c2["id"]), user, `{"watchlistId":99999}`); code != 422 {
		t.Errorf("unknown watchlist = %d, want 422", code)
	}

	// Approach settings: defaults, explicit updates, validation, template copy.
	if c := d["campaign"].(map[string]any); c["moneyness"] != "OTM" || c["holdingDuration"] != "1-4w" || c["risk"] != "moderate" {
		t.Errorf("defaults: %v %v %v", c["moneyness"], c["holdingDuration"], c["risk"])
	}
	if opts := d["campaignOptions"].(map[string]any); len(opts["strategies"].([]any)) != 5 {
		t.Errorf("campaignOptions: %v", opts)
	}
	settingsURL := fmt.Sprintf("%s/api/campaigns/%v/settings", srv.URL, c1["id"])
	code, upd := call(t, "PATCH", settingsURL, user, `{"strategies":["covered_call","CSP","iron_condor"],"moneyness":"atm","holdingDuration":"intraday","risk":"high"}`)
	if code != 200 || upd["moneyness"] != "ATM" || upd["risk"] != "high" || len(upd["strategies"].([]any)) != 3 {
		t.Errorf("settings update: %d %v", code, upd)
	}
	for _, bad := range []string{`{"strategies":[]}`, `{"strategies":["butterfly"]}`, `{"holdingDuration":"2y"}`, `{"risk":"extreme"}`, `{"moneyness":"deep"}`} {
		if code, _ := call(t, "PATCH", settingsURL, user, bad); code != 422 {
			t.Errorf("%s: status %d, want 422", bad, code)
		}
	}
	_, ap := call(t, "POST", srv.URL+"/api/approaches", user, `{"name":"Wheel test","strategies":["Cash-Secured Put","Covered Call"],"moneyness":"OTM","holdingPeriod":"60d+","minYield":8,"risk":"aggressive","takeProfit":75,"stopLoss":15,"maxPosition":10,"dteCloseThreshold":21,"assignmentHandling":"roll","autoRoll":true}`)
	code, upd = call(t, "PATCH", settingsURL, user, fmt.Sprintf(`{"approachId":%v}`, ap["id"]))
	if code != 200 || upd["holdingDuration"] != "1m+" || upd["risk"] != "high" || upd["approachId"] != ap["id"] {
		t.Errorf("template copy: %d %v", code, upd)
	}

	// Another user can't see or select these campaigns.
	if _, d = call(t, "GET", srv.URL+"/api/dashboard", "other@example.com", ""); d["campaign"] != nil {
		t.Errorf("other user sees %v", d["campaign"])
	}
	if code, _ := call(t, "PUT", srv.URL+"/api/dashboard/active", "other@example.com", fmt.Sprintf(`{"campaignId":%v}`, c1["id"])); code != 404 {
		t.Errorf("other user set active = %d, want 404", code)
	}
}

package api

import (
	"fmt"
	"testing"
	"time"
)

func TestPositionIntelligenceLifecycle(t *testing.T) {
	srv := newTestServer(t)
	const user = "intel@example.com"
	start := time.Now().AddDate(0, 0, -10).Format("2006-01-02")
	end := time.Now().AddDate(0, 6, 0).Format("2006-01-02")
	_, c := call(t, "POST", srv.URL+"/api/campaigns", user,
		fmt.Sprintf(`{"name":"Income","capital":100000,"goal":110000,"status":"active","startDate":%q,"endDate":%q}`, start, end))

	// Two cash-secured puts sold for $5.00 that now cost ~$2.26 to buy back:
	// 55% captured, and $38k of collateral is over the 25% capital limit.
	day := time.Now().UTC().Truncate(24 * time.Hour)
	expiry := day.AddDate(0, 0, 25).Format("2006-01-02")
	code, p := call(t, "POST", srv.URL+"/api/positions", user, fmt.Sprintf(`{"campaignId":%v,"symbol":"AAPL","strategy":"Cash-Secured Put",
		"quantity":2,"expiry":%q,"premiumCredit":500,"openedAt":%q,"legs":[{"action":"sell","type":"put","strike":190,"premium":5}],
		"entryPrice":200,"entryIV":0.3,"entryDelta":0.25,"entryPOP":78}`, c["id"], expiry, day.AddDate(0, 0, -5).Format("2006-01-02")))
	if code != 201 && code != 200 {
		t.Fatalf("create position: %d %v", code, p)
	}
	id := p["id"]
	if p["strike"] != float64(190) {
		t.Errorf("strike from legs = %v", p["strike"])
	}

	// Existing positions screen.
	code, list := call(t, "GET", srv.URL+"/api/positions/intelligence", user, "")
	rows := list["positions"].([]any)
	if code != 200 || len(rows) != 1 {
		t.Fatalf("list: %d %v", code, list)
	}
	row := rows[0].(map[string]any)
	if row["action"] == "" || row["current"] == nil || row["overview"].(map[string]any)["openPL"] == nil {
		t.Errorf("row: %v", row)
	}

	// Details.
	code, a := call(t, "GET", fmt.Sprintf("%s/api/positions/%v/intelligence", srv.URL, id), user, "")
	if code != 200 {
		t.Fatalf("detail: %d %v", code, a)
	}
	rec := a["recommendation"].(map[string]any)
	if rec["kind"] != "close" {
		t.Errorf("55%%-captured, over-limit puts should close for profit, got %v (%v)", rec["kind"], rec["summary"])
	}
	if len(a["changes"].([]any)) < 5 || len(a["alternatives"].([]any)) < 2 || a["decision"].(map[string]any)["summary"] == "" {
		t.Errorf("assessment incomplete: %v", a)
	}

	// Stale or unknown action → 409.
	if code, body := call(t, "POST", fmt.Sprintf("%s/api/positions/%v/actions", srv.URL, id), user, `{"actionId":"nope"}`); code != 409 || body["code"] != "stale" {
		t.Errorf("unknown action: %d %v", code, body)
	}
	// Reviewed net credit far from the fresh one → 409.
	if code, _ := call(t, "POST", fmt.Sprintf("%s/api/positions/%v/actions", srv.URL, id), user, `{"actionId":"close","reviewedNetCredit":-5000}`); code != 409 {
		t.Errorf("moved price accepted: %d", code)
	}

	// Confirm the recommendation.
	code, res := call(t, "POST", fmt.Sprintf("%s/api/positions/%v/actions", srv.URL, id), user,
		fmt.Sprintf(`{"actionId":%q,"reviewedNetCredit":%v}`, rec["id"], rec["netCredit"]))
	if code != 200 || res["position"].(map[string]any)["status"] != "closed" || res["realizedPL"].(float64) <= 0 {
		t.Fatalf("apply: %d %v", code, res)
	}
	if len(res["tradeLog"].([]any)) != 1 || res["campaign"].(map[string]any)["earned"].(float64) != res["realizedPL"].(float64) {
		t.Errorf("trade log / campaign earned: %v / %v", res["tradeLog"], res["campaign"])
	}
	// Closed positions leave the list; the notification was raised.
	_, list = call(t, "GET", srv.URL+"/api/positions/intelligence", user, "")
	if len(list["positions"].([]any)) != 0 {
		t.Errorf("closed position still listed")
	}
	_, n := call(t, "GET", srv.URL+"/api/notifications", user, "")
	if fmt.Sprint(n) == "" || !contains(fmt.Sprint(n), "AAPL: Close") {
		t.Errorf("no action notification: %v", n)
	}
	// Other users can't see or act on it.
	if code, _ := call(t, "GET", fmt.Sprintf("%s/api/positions/%v/intelligence", srv.URL, id), "else@example.com", ""); code != 404 {
		t.Errorf("other user: %d", code)
	}
}

func contains(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}

package api

import (
	"fmt"
	"testing"
)

func TestCampaignActions(t *testing.T) {
	srv := newTestServer(t)
	const user = "actions@example.com"
	_, c := call(t, "POST", srv.URL+"/api/campaigns", user,
		`{"name":"Wheel","capital":10000,"goal":12000,"earned":300,"status":"active","startDate":"2020-01-01","endDate":"2099-12-31","marketOutlook":"bullish"}`)
	id := c["id"]

	// List carries metrics, health and the richer summary.
	_, list := call(t, "GET", srv.URL+"/api/campaigns", user, "")
	item := list["campaigns"].([]any)[0].(map[string]any)
	if item["health"] == nil || item["metrics"].(map[string]any)["netTarget"] != float64(2000) {
		t.Fatalf("list item: %v", item)
	}
	sum := list["summary"].(map[string]any)
	if sum["total"] != float64(1) || sum["premiumRunRate"] == nil || sum["byHealth"] == nil {
		t.Errorf("summary: %v", sum)
	}

	settings := fmt.Sprintf("%s/api/campaigns/%v/settings", srv.URL, id)
	if code, out := call(t, "PATCH", settings, user, `{"status":"paused"}`); code != 200 || out["status"] != "paused" {
		t.Errorf("pause: %d %v", code, out)
	}
	_, list = call(t, "GET", srv.URL+"/api/campaigns", user, "")
	if h := list["campaigns"].([]any)[0].(map[string]any)["health"]; h != "paused" {
		t.Errorf("health after pause = %v", h)
	}
	if code, out := call(t, "PATCH", settings, user, `{"status":"active"}`); code != 200 || out["status"] != "active" {
		t.Errorf("resume: %d %v", code, out)
	}
	if code, _ := call(t, "PATCH", settings, user, `{"status":"deleted"}`); code != 422 {
		t.Errorf("bad status = %d, want 422", code)
	}

	// Duplicate twice: unique names, nothing earned, same settings.
	code, d1 := call(t, "POST", fmt.Sprintf("%s/api/campaigns/%v/duplicate", srv.URL, id), user, "")
	if code != 201 || d1["name"] != "Wheel (copy)" || d1["earned"] != float64(0) || d1["marketOutlook"] != "bullish" {
		t.Errorf("duplicate: %d %v", code, d1)
	}
	if _, d2 := call(t, "POST", fmt.Sprintf("%s/api/campaigns/%v/duplicate", srv.URL, id), user, ""); d2["name"] != "Wheel (copy 2)" {
		t.Errorf("second duplicate name = %v", d2["name"])
	}
	if code, _ := call(t, "POST", fmt.Sprintf("%s/api/campaigns/%v/duplicate", srv.URL, id), "intruder@example.com", ""); code != 404 {
		t.Errorf("duplicate by another user = %d, want 404", code)
	}

	// Delete.
	if code, _ := call(t, "DELETE", fmt.Sprintf("%s/api/campaigns/%v", srv.URL, d1["id"]), user, ""); code != 204 {
		t.Errorf("delete = %d", code)
	}
	_, list = call(t, "GET", srv.URL+"/api/campaigns", user, "")
	if n := len(list["campaigns"].([]any)); n != 2 {
		t.Errorf("after delete: %d campaigns, want 2", n)
	}
}

package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"testing"

	"optiontrading/backend/internal/approaches"
)

func send(t *testing.T, method, url, body string) (*http.Response, map[string]any) {
	t.Helper()
	req, _ := http.NewRequest(method, url, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var out map[string]any
	var buf bytes.Buffer
	buf.ReadFrom(res.Body)
	if buf.Len() > 0 {
		json.Unmarshal(buf.Bytes(), &out)
	}
	return res, out
}

const validBody = `{"name":"Income","strategies":["Covered Call","Cash-Secured Put"],"moneyness":"OTM",
"holdingPeriod":"30-45d","minYield":8,"risk":"lower","takeProfit":75,"stopLoss":15,"maxPosition":10,
"dteCloseThreshold":21,"assignmentHandling":"roll","autoRoll":true}`

func TestApproachesCRUD(t *testing.T) {
	srv := newTestServer(t)
	base := srv.URL + "/api/approaches"

	res, created := send(t, http.MethodPost, base, validBody)
	if res.StatusCode != http.StatusCreated {
		t.Fatalf("create status %d: %v", res.StatusCode, created)
	}
	id := int(created["id"].(float64))
	if res.Header.Get("Location") == "" || created["autoRoll"] != true {
		t.Errorf("unexpected create response: %v", created)
	}

	res, _ = send(t, http.MethodPost, base, strings.Replace(validBody, `"Income"`, `"income"`, 1))
	if res.StatusCode != http.StatusConflict {
		t.Errorf("duplicate name status = %d, want 409", res.StatusCode)
	}

	updated := strings.Replace(validBody, `"Income"`, `"Income v2"`, 1)
	res, got := send(t, http.MethodPut, base+"/"+strconv.Itoa(id), updated)
	if res.StatusCode != http.StatusOK || got["name"] != "Income v2" {
		t.Errorf("update: %d %v", res.StatusCode, got)
	}

	var list struct{ Approaches []approaches.Approach }
	getJSON(t, base, http.StatusOK, &list)
	if len(list.Approaches) != 1 || list.Approaches[0].Name != "Income v2" {
		t.Errorf("list: %+v", list)
	}

	if res, _ = send(t, http.MethodDelete, base+"/"+strconv.Itoa(id), ""); res.StatusCode != http.StatusNoContent {
		t.Errorf("delete status %d", res.StatusCode)
	}
	getJSON(t, base+"/"+strconv.Itoa(id), http.StatusNotFound, nil)
}

func TestApproachValidationErrors(t *testing.T) {
	srv := newTestServer(t)
	res, body := send(t, http.MethodPost, srv.URL+"/api/approaches", `{"name":"","strategies":[],"moneyness":"XYZ"}`)
	if res.StatusCode != http.StatusUnprocessableEntity {
		t.Fatalf("status %d, want 422", res.StatusCode)
	}
	fields, _ := body["fields"].(map[string]any)
	for _, f := range []string{"name", "strategies", "moneyness"} {
		if fields[f] == nil {
			t.Errorf("missing field error for %s: %v", f, fields)
		}
	}
	if res, _ := send(t, http.MethodPost, srv.URL+"/api/approaches", `{"unknown":1}`); res.StatusCode != http.StatusBadRequest {
		t.Errorf("unknown field status %d, want 400", res.StatusCode)
	}
	if res, _ := send(t, http.MethodPut, srv.URL+"/api/approaches/abc", validBody); res.StatusCode != http.StatusBadRequest {
		t.Errorf("bad id status %d, want 400", res.StatusCode)
	}
}

func TestApproachOptions(t *testing.T) {
	srv := newTestServer(t)
	var opts approaches.Options
	getJSON(t, srv.URL+"/api/approaches/options", http.StatusOK, &opts)
	if len(opts.Strategies) != 16 || len(opts.HoldingPeriods) != 4 {
		t.Errorf("options: %+v", opts)
	}
}

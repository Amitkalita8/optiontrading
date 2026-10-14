package api

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

type fakeLLM struct{}

func (fakeLLM) Complete(_ context.Context, _, user string) (string, error) {
	return `{"rating":"Good","outlook":"neutral","confidence":"high","headline":"Steady",
		"summary":"s","answer":"","reasons":["r"],"risks":["k"],
		"optionIdea":{"strategy":"Cash-Secured Put","rationale":"x"}}`, nil
}

func postAsk(t *testing.T, url, body string) (*http.Response, map[string]any) {
	t.Helper()
	res, err := http.Post(url+"/api/screener/ask", "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var out map[string]any
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		t.Fatal(err)
	}
	return res, out
}

func TestAskScreener(t *testing.T) {
	srv := newTestServer(t)

	res, out := postAsk(t, srv.URL, `{"symbol":"aapl","question":"Is it good for puts?"}`)
	if res.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, body %v", res.StatusCode, out)
	}
	if out["symbol"] != "AAPL" || out["rating"] != "good" || out["disclaimer"] == "" {
		t.Errorf("unexpected analysis: %v", out)
	}

	if res, _ := postAsk(t, srv.URL, `{"symbol":"not a ticker"}`); res.StatusCode != http.StatusUnprocessableEntity {
		t.Errorf("bad symbol status = %d, want 422", res.StatusCode)
	}
	if res, _ := postAsk(t, srv.URL, `{"symbol":"NOPE"}`); res.StatusCode != http.StatusNotFound {
		t.Errorf("unknown symbol status = %d, want 404", res.StatusCode)
	}
}

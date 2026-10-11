package api

import (
	"bufio"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"optiontrading/backend/internal/approaches"
	"optiontrading/backend/internal/config"
	"optiontrading/backend/internal/market"
	"optiontrading/backend/internal/quotes"
	"optiontrading/backend/internal/store"
)

type fakeFetcher struct{}

func (fakeFetcher) History(_ context.Context, symbol string, r quotes.Range) (quotes.History, error) {
	if symbol == "NOPE" {
		return quotes.History{}, quotes.ErrNotFound
	}
	return quotes.History{Symbol: symbol, Range: r.Key, Points: []quotes.Point{{T: 1, P: 2}}}, nil
}

func (fakeFetcher) Fetch(_ context.Context, symbol string) (quotes.Quote, error) {
	if symbol == "NOPE" {
		return quotes.Quote{}, quotes.ErrNotFound
	}
	return quotes.Quote{Symbol: symbol, Price: 123.45, Series: []float64{1, 2, 3}}, nil
}

func newTestServer(t *testing.T) *httptest.Server {
	t.Helper()
	cfg := config.Config{
		AllowedOrigins:       []string{"http://localhost:3000"},
		StreamIntervalOpen:   50 * time.Millisecond,
		StreamIntervalClosed: 50 * time.Millisecond,
	}
	db, err := store.Open(filepath.Join(t.TempDir(), "api.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	a := New(cfg, quotes.NewService(fakeFetcher{}, time.Second), approaches.NewRepository(db))
	srv := httptest.NewServer(a.Routes())
	t.Cleanup(srv.Close)
	return srv
}

func getJSON(t *testing.T, url string, wantStatus int, into any) {
	t.Helper()
	res, err := http.Get(url)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != wantStatus {
		t.Fatalf("GET %s: status %d, want %d", url, res.StatusCode, wantStatus)
	}
	if into != nil {
		if err := json.NewDecoder(res.Body).Decode(into); err != nil {
			t.Fatal(err)
		}
	}
}

func TestMarketStatus(t *testing.T) {
	srv := newTestServer(t)
	var s market.Status
	getJSON(t, srv.URL+"/api/market/status", http.StatusOK, &s)
	if s.Phase == "" || s.NextOpen.IsZero() || s.Timezone != "America/New_York" {
		t.Errorf("unexpected status: %+v", s)
	}
}

func TestQuote(t *testing.T) {
	srv := newTestServer(t)
	var q quotes.Quote
	getJSON(t, srv.URL+"/api/market/quote/aapl", http.StatusOK, &q)
	if q.Symbol != "AAPL" || q.Series != nil {
		t.Errorf("want AAPL without series, got %+v", q)
	}
	getJSON(t, srv.URL+"/api/market/quote/aapl?series=1", http.StatusOK, &q)
	if len(q.Series) != 3 {
		t.Errorf("series=1 should include series, got %v", q.Series)
	}
	getJSON(t, srv.URL+"/api/market/quote/NOPE", http.StatusNotFound, nil)
	getJSON(t, srv.URL+"/api/market/quote/a%2Fb", http.StatusBadRequest, nil)
}

func TestQuotesBatch(t *testing.T) {
	srv := newTestServer(t)
	var resp batchResponse
	getJSON(t, srv.URL+"/api/market/quotes?symbols=msft,AAPL,msft,NOPE", http.StatusOK, &resp)
	if len(resp.Quotes) != 2 || resp.Quotes[0].Symbol != "MSFT" || resp.Quotes[1].Symbol != "AAPL" {
		t.Errorf("quotes should be deduped and in request order: %+v", resp.Quotes)
	}
	if resp.Errors["NOPE"] != "not found" {
		t.Errorf("errors = %v", resp.Errors)
	}
	getJSON(t, srv.URL+"/api/market/quotes", http.StatusBadRequest, nil)
}

func TestCORS(t *testing.T) {
	srv := newTestServer(t)
	req, _ := http.NewRequest(http.MethodGet, srv.URL+"/api/health", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if got := res.Header.Get("Access-Control-Allow-Origin"); got != "http://localhost:3000" {
		t.Errorf("allowed origin header = %q", got)
	}

	req.Header.Set("Origin", "https://evil.example")
	res, _ = http.DefaultClient.Do(req)
	res.Body.Close()
	if got := res.Header.Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("disallowed origin got header %q", got)
	}
}

func TestStreamSendsStatusThenQuotes(t *testing.T) {
	srv := newTestServer(t)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, srv.URL+"/api/market/stream?symbols=AAPL&series=1", nil)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if ct := res.Header.Get("Content-Type"); ct != "text/event-stream" {
		t.Fatalf("content-type = %q", ct)
	}

	var events []string
	sc := bufio.NewScanner(res.Body)
	for sc.Scan() && len(events) < 3 {
		if name, ok := strings.CutPrefix(sc.Text(), "event: "); ok {
			events = append(events, name)
		}
	}
	want := []string{"status", "quotes", "quotes"}
	if strings.Join(events, ",") != strings.Join(want, ",") {
		t.Errorf("events = %v, want %v", events, want)
	}
}

func TestHistory(t *testing.T) {
	srv := newTestServer(t)
	var h quotes.History
	getJSON(t, srv.URL+"/api/market/history/aapl", http.StatusOK, &h)
	if h.Symbol != "AAPL" || h.Range != "1D" || len(h.Points) != 1 {
		t.Errorf("default range should be 1D: %+v", h)
	}
	getJSON(t, srv.URL+"/api/market/history/aapl?range=5y", http.StatusOK, &h)
	if h.Range != "5Y" {
		t.Errorf("range = %s, want 5Y", h.Range)
	}
	getJSON(t, srv.URL+"/api/market/history/aapl?range=2D", http.StatusBadRequest, nil)
	getJSON(t, srv.URL+"/api/market/history/NOPE", http.StatusNotFound, nil)
}

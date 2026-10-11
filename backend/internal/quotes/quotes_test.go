package quotes

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

const sampleChart = `{"chart":{"result":[{"meta":{"symbol":"AAPL","longName":"Apple Inc.","exchangeName":"NMS",
"currency":"USD","regularMarketPrice":336.67,"regularMarketTime":1791403201,"previousClose":333.63},
"indicators":{"quote":[{"close":[334.1,null,335.5,336.67]}]}}],"error":null}}`

func TestClientFetchParsesChart(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("User-Agent") == "" {
			t.Error("missing User-Agent")
		}
		if r.URL.Path != "/v8/finance/chart/AAPL" {
			t.Errorf("path = %s", r.URL.Path)
		}
		w.Write([]byte(sampleChart))
	}))
	defer srv.Close()

	c := &Client{HTTP: srv.Client(), BaseURL: srv.URL}
	q, err := c.Fetch(context.Background(), "AAPL")
	if err != nil {
		t.Fatal(err)
	}
	if q.Name != "Apple Inc." || q.Exchange != "NASDAQ" || q.Price != 336.67 {
		t.Errorf("unexpected quote: %+v", q)
	}
	if got, want := q.Change, 336.67-333.63; abs(got-want) > 1e-9 {
		t.Errorf("change = %v, want %v", got, want)
	}
	if len(q.Series) != 3 {
		t.Errorf("series should skip nulls, got %v", q.Series)
	}
}

func TestClientFetchNotFound(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`{"chart":{"result":null,"error":{"code":"Not Found","description":"No data found"}}}`))
	}))
	defer srv.Close()

	c := &Client{HTTP: srv.Client(), BaseURL: srv.URL}
	if _, err := c.Fetch(context.Background(), "NOPE"); !errors.Is(err, ErrNotFound) {
		t.Errorf("err = %v, want ErrNotFound", err)
	}
}

type fakeFetcher struct {
	calls atomic.Int32
	err   error
	delay time.Duration
}

func (f *fakeFetcher) History(ctx context.Context, symbol string, r Range) (History, error) {
	f.calls.Add(1)
	return History{Symbol: symbol, Range: r.Key}, f.err
}

func (f *fakeFetcher) Fetch(ctx context.Context, symbol string) (Quote, error) {
	f.calls.Add(1)
	time.Sleep(f.delay)
	if f.err != nil {
		return Quote{}, f.err
	}
	return Quote{Symbol: symbol, Price: 100}, nil
}

func TestServiceCachesAndDedupes(t *testing.T) {
	f := &fakeFetcher{delay: 20 * time.Millisecond}
	s := NewService(f, time.Minute)

	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() { defer wg.Done(); s.Get(context.Background(), "MSFT") }()
	}
	wg.Wait()
	if n := f.calls.Load(); n != 1 {
		t.Errorf("10 concurrent gets made %d upstream calls, want 1", n)
	}
}

func TestServiceRefetchesAfterTTLAndFallsBackToStale(t *testing.T) {
	f := &fakeFetcher{}
	s := NewService(f, time.Second)
	now := time.Now()
	s.now = func() time.Time { return now }

	if _, err := s.Get(context.Background(), "MSFT"); err != nil {
		t.Fatal(err)
	}
	now = now.Add(2 * time.Second)
	f.err = errors.New("upstream down")
	q, err := s.Get(context.Background(), "MSFT")
	if err != nil || q.Price != 100 {
		t.Errorf("expected stale fallback, got %+v, %v", q, err)
	}
	if n := f.calls.Load(); n != 2 {
		t.Errorf("calls = %d, want 2 (refetch after TTL)", n)
	}
}

func TestNormalizeSymbol(t *testing.T) {
	for in, want := range map[string]string{" aapl ": "AAPL", "brk.b": "BRK.B", "^GSPC": "", "": "", "a/b": ""} {
		got, err := NormalizeSymbol(in)
		if want == "" && err == nil {
			t.Errorf("NormalizeSymbol(%q) = %q, want error", in, got)
		}
		if want != "" && got != want {
			t.Errorf("NormalizeSymbol(%q) = %q, want %q", in, got, want)
		}
	}
}

func abs(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}

const sampleHistory = `{"chart":{"result":[{"meta":{"symbol":"AAPL","currency":"USD","previousClose":333.63,"chartPreviousClose":330.1},
"timestamp":[1791379800,1791379860,1791379920],"indicators":{"quote":[{"close":[334.1,null,335.5]}]}}],"error":null}}`

func TestClientHistory(t *testing.T) {
	var gotQuery string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotQuery = r.URL.RawQuery
		w.Write([]byte(sampleHistory))
	}))
	defer srv.Close()
	c := &Client{HTTP: srv.Client(), BaseURL: srv.URL, Now: time.Now}

	oneDay, _ := ParseRange("1d")
	h, err := c.History(context.Background(), "AAPL", oneDay)
	if err != nil {
		t.Fatal(err)
	}
	if gotQuery != "interval=1m&range=1d" {
		t.Errorf("query = %s", gotQuery)
	}
	if len(h.Points) != 2 || h.Points[0] != (Point{T: 1791379800000, P: 334.1}) || h.Points[1].T != 1791379920000 {
		t.Errorf("points should skip nulls and keep their own timestamps: %+v", h.Points)
	}
	if h.Baseline != 333.63 {
		t.Errorf("1D baseline should be previous close, got %v", h.Baseline)
	}

	oneYear, _ := ParseRange("1Y")
	if h, _ = c.History(context.Background(), "AAPL", oneYear); h.Baseline != 334.1 {
		t.Errorf("1Y baseline should be the first point, got %v", h.Baseline)
	}
}

func TestClientHistoryThreeYearsUsesPeriod(t *testing.T) {
	var gotQuery string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotQuery = r.URL.RawQuery
		w.Write([]byte(sampleHistory))
	}))
	defer srv.Close()
	now := time.Unix(1_800_000_000, 0)
	c := &Client{HTTP: srv.Client(), BaseURL: srv.URL, Now: func() time.Time { return now }}

	r, _ := ParseRange("3y")
	if _, err := c.History(context.Background(), "AAPL", r); err != nil {
		t.Fatal(err)
	}
	want := "interval=1wk&period1=1705392000&period2=1800000000"
	if gotQuery != want {
		t.Errorf("query = %s, want %s", gotQuery, want)
	}
}

func TestParseRange(t *testing.T) {
	for _, s := range []string{"1D", "1w", "all", " 5y "} {
		if _, ok := ParseRange(s); !ok {
			t.Errorf("ParseRange(%q) should succeed", s)
		}
	}
	if _, ok := ParseRange("2D"); ok {
		t.Error("ParseRange(2D) should fail")
	}
}

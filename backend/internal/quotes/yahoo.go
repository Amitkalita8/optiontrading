// Package quotes fetches stock quotes and price history from Yahoo Finance's
// chart API.
//
// This is an unofficial, free endpoint: no API key, but no SLA either and it
// can change or rate-limit without notice. Prices are near real-time for US
// equities during market hours. Swap Client for a licensed feed in production.
package quotes

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

// ErrNotFound means Yahoo has no data for the symbol.
var ErrNotFound = errors.New("symbol not found")

// Quote is a snapshot of one symbol.
type Quote struct {
	Symbol        string    `json:"symbol"`
	Name          string    `json:"name"`
	Exchange      string    `json:"exchange"`
	Currency      string    `json:"currency"`
	Price         float64   `json:"price"`
	PreviousClose float64   `json:"previousClose"`
	Change        float64   `json:"change"`
	ChangePercent float64   `json:"changePercent"`
	DayHigh       float64   `json:"dayHigh"`
	DayLow        float64   `json:"dayLow"`
	YearHigh      float64   `json:"yearHigh"`
	YearLow       float64   `json:"yearLow"`
	Volume        int64     `json:"volume"`
	MarketTime    time.Time `json:"marketTime"`
	// Series holds today's 5-minute closes, oldest first (omitted unless requested).
	Series []float64 `json:"series,omitempty"`
	// Stale indicates the quote was served from cache fallback due to upstream error.
	Stale bool `json:"stale,omitempty"`
}

// Yahoo exchange codes -> display names.
var exchangeNames = map[string]string{
	"NMS": "NASDAQ", "NGM": "NASDAQ", "NCM": "NASDAQ", "NAS": "NASDAQ",
	"NYQ": "NYSE", "ASE": "NYSE American", "PCX": "NYSE Arca", "BTS": "Cboe BZX",
}

type Client struct {
	HTTP    *http.Client
	BaseURL string // default https://query1.finance.yahoo.com
	Now     func() time.Time
}

func NewClient() *Client {
	return &Client{
		HTTP:    &http.Client{Timeout: 8 * time.Second},
		BaseURL: "https://query1.finance.yahoo.com",
		Now:     time.Now,
	}
}

type chartMeta struct {
	Symbol             string  `json:"symbol"`
	LongName           string  `json:"longName"`
	ShortName          string  `json:"shortName"`
	ExchangeName       string  `json:"exchangeName"`
	FullExchangeName   string  `json:"fullExchangeName"`
	Currency           string  `json:"currency"`
	RegularMarketPrice float64 `json:"regularMarketPrice"`
	RegularMarketTime  int64   `json:"regularMarketTime"`
	PreviousClose      float64 `json:"previousClose"`
	ChartPreviousClose float64 `json:"chartPreviousClose"`
	DayHigh            float64 `json:"regularMarketDayHigh"`
	DayLow             float64 `json:"regularMarketDayLow"`
	Volume             int64   `json:"regularMarketVolume"`
	YearHigh           float64 `json:"fiftyTwoWeekHigh"`
	YearLow            float64 `json:"fiftyTwoWeekLow"`
}

type chartResult struct {
	Meta       chartMeta `json:"meta"`
	Timestamp  []int64   `json:"timestamp"`
	Indicators struct {
		Quote []struct {
			Close []*float64 `json:"close"`
		} `json:"quote"`
	} `json:"indicators"`
}

type chartResponse struct {
	Chart struct {
		Result []chartResult `json:"result"`
		Error  *struct {
			Code        string `json:"code"`
			Description string `json:"description"`
		} `json:"error"`
	} `json:"chart"`
}

// chart calls /v8/finance/chart/{symbol} with the given query, retrying transient errors.
func (c *Client) chart(ctx context.Context, symbol string, query url.Values) (chartResult, error) {
	u := fmt.Sprintf("%s/v8/finance/chart/%s?%s", c.BaseURL, url.PathEscape(symbol), query.Encode())

	const maxRetries = 2
	var lastErr error
	for attempt := 0; attempt <= maxRetries; attempt++ {
		if attempt > 0 {
			select {
			case <-ctx.Done():
				return chartResult{}, ctx.Err()
			case <-time.After(300 * time.Millisecond):
			}
		}

		req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
		if err != nil {
			return chartResult{}, err
		}
		// Yahoo rejects requests without a browser-like User-Agent.
		req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; optiontrading-backend/1.0)")
		req.Header.Set("Accept", "application/json")

		res, err := c.HTTP.Do(req)
		if err != nil {
			lastErr = fmt.Errorf("yahoo %s: %w", symbol, err)
			continue
		}

		var body chartResponse
		decodeErr := json.NewDecoder(res.Body).Decode(&body)
		res.Body.Close()
		if decodeErr != nil {
			lastErr = fmt.Errorf("yahoo %s: status %d: decode: %w", symbol, res.StatusCode, decodeErr)
			continue
		}
		if body.Chart.Error != nil {
			if body.Chart.Error.Code == "Not Found" {
				return chartResult{}, ErrNotFound
			}
			lastErr = fmt.Errorf("yahoo %s: %s", symbol, body.Chart.Error.Description)
			continue
		}
		if res.StatusCode != http.StatusOK || len(body.Chart.Result) == 0 {
			lastErr = fmt.Errorf("yahoo %s: unexpected status %d", symbol, res.StatusCode)
			continue
		}
		return body.Chart.Result[0], nil
	}
	return chartResult{}, lastErr
}

func (r chartResult) rawCloses() []*float64 {
	if len(r.Indicators.Quote) == 0 {
		return nil
	}
	return r.Indicators.Quote[0].Close
}

// closeValues returns the non-null closes, oldest first.
func (r chartResult) closeValues() []float64 {
	var out []float64
	for _, v := range r.rawCloses() {
		if v != nil {
			out = append(out, *v)
		}
	}
	return out
}

// points returns non-null closes paired with their bar timestamps (ms).
func (r chartResult) points() []Point {
	var out []Point
	for i, v := range r.rawCloses() {
		if v != nil && i < len(r.Timestamp) {
			out = append(out, Point{T: r.Timestamp[i] * 1000, P: *v})
		}
	}
	return out
}

// Fetch returns the latest quote for symbol, including today's intraday series.
func (c *Client) Fetch(ctx context.Context, symbol string) (Quote, error) {
	r, err := c.chart(ctx, symbol, url.Values{"interval": {"5m"}, "range": {"1d"}})
	if err != nil {
		return Quote{}, err
	}
	m := r.Meta
	prev := m.PreviousClose
	if prev == 0 {
		prev = m.ChartPreviousClose
	}
	q := Quote{
		Symbol:        m.Symbol,
		Name:          firstNonEmpty(m.LongName, m.ShortName, m.Symbol),
		Exchange:      firstNonEmpty(exchangeNames[m.ExchangeName], m.FullExchangeName, m.ExchangeName),
		Currency:      m.Currency,
		Price:         m.RegularMarketPrice,
		PreviousClose: prev,
		DayHigh:       m.DayHigh,
		DayLow:        m.DayLow,
		YearHigh:      m.YearHigh,
		YearLow:       m.YearLow,
		Volume:        m.Volume,
		MarketTime:    time.Unix(m.RegularMarketTime, 0).UTC(),
	}
	if prev != 0 {
		q.Change = q.Price - prev
		q.ChangePercent = q.Change / prev * 100
	}
	q.Series = r.closeValues()
	return q, nil
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}

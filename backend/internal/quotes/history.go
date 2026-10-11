package quotes

import (
	"context"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Range is a chart time span (the 1D / 1W / … buttons) and how to fetch it.
type Range struct {
	Key      string        // "1D", "1W", …
	yahoo    string        // Yahoo `range` param; empty when using lookback
	lookback time.Duration // used instead of yahoo (Yahoo has no 3-year range)
	Interval string        // Yahoo bar size
	TTL      time.Duration // cache lifetime
}

// Ranges in display order. Intervals keep each chart at ~120–400 points.
var Ranges = []Range{
	{Key: "1D", yahoo: "1d", Interval: "1m", TTL: 30 * time.Second},
	{Key: "1W", yahoo: "5d", Interval: "15m", TTL: 2 * time.Minute},
	{Key: "1M", yahoo: "1mo", Interval: "60m", TTL: 10 * time.Minute},
	{Key: "3M", yahoo: "3mo", Interval: "1d", TTL: 30 * time.Minute},
	{Key: "6M", yahoo: "6mo", Interval: "1d", TTL: 30 * time.Minute},
	{Key: "1Y", yahoo: "1y", Interval: "1d", TTL: time.Hour},
	{Key: "3Y", lookback: 3 * 365 * 24 * time.Hour, Interval: "1wk", TTL: 6 * time.Hour},
	{Key: "5Y", yahoo: "5y", Interval: "1wk", TTL: 6 * time.Hour},
	{Key: "ALL", yahoo: "max", Interval: "1mo", TTL: 12 * time.Hour},
}

// ParseRange accepts "1d", "1W", "all", … (case-insensitive).
func ParseRange(s string) (Range, bool) {
	key := strings.ToUpper(strings.TrimSpace(s))
	for _, r := range Ranges {
		if r.Key == key {
			return r, true
		}
	}
	return Range{}, false
}

// Point is one price at a time (Unix milliseconds, for easy use in JS).
type Point struct {
	T int64   `json:"t"`
	P float64 `json:"p"`
}

// History is a price series for a symbol over a range.
type History struct {
	Symbol   string `json:"symbol"`
	Range    string `json:"range"`
	Interval string `json:"interval"`
	Currency string `json:"currency"`
	// Baseline is what the range's change is measured against: the previous
	// close for 1D, otherwise the first point.
	Baseline float64 `json:"baseline"`
	Points   []Point `json:"points"`
}

// History fetches the price series for symbol over r.
func (c *Client) History(ctx context.Context, symbol string, r Range) (History, error) {
	q := url.Values{"interval": {r.Interval}}
	if r.yahoo != "" {
		q.Set("range", r.yahoo)
	} else {
		now := c.Now()
		q.Set("period1", strconv.FormatInt(now.Add(-r.lookback).Unix(), 10))
		q.Set("period2", strconv.FormatInt(now.Unix(), 10))
	}
	res, err := c.chart(ctx, symbol, q)
	if err != nil {
		return History{}, err
	}

	h := History{
		Symbol:   res.Meta.Symbol,
		Range:    r.Key,
		Interval: r.Interval,
		Currency: res.Meta.Currency,
		Points:   res.points(),
	}
	if h.Points == nil {
		h.Points = []Point{} // encode as [] rather than null
	}
	switch {
	case r.Key == "1D" && res.Meta.PreviousClose != 0:
		h.Baseline = res.Meta.PreviousClose
	case r.Key == "1D" && res.Meta.ChartPreviousClose != 0:
		h.Baseline = res.Meta.ChartPreviousClose
	case len(h.Points) > 0:
		h.Baseline = h.Points[0].P
	}
	return h, nil
}

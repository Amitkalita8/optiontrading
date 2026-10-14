// Package insights asks an LLM (Groq) to rate a stock for option sellers,
// grounded in live price data the backend computes itself.
package insights

import (
	"math"

	"optiontrading/backend/internal/quotes"
)

// Metrics are the numbers the model reasons over (and the UI shows). Fields
// are nil when there isn't enough history to compute them.
type Metrics struct {
	Price         float64  `json:"price"`
	ChangePercent float64  `json:"changePercent"`
	Return1M      *float64 `json:"return1M"` // %
	Return3M      *float64 `json:"return3M"` // %
	Return1Y      *float64 `json:"return1Y"` // %
	SMA50         *float64 `json:"sma50"`
	SMA200        *float64 `json:"sma200"`
	Volatility30D *float64 `json:"volatility30D"` // annualised %, from daily closes
	YearHigh      float64  `json:"yearHigh"`
	YearLow       float64  `json:"yearLow"`
	// RangePosition is where the price sits in the 52-week range (0 = low, 100 = high).
	RangePosition *float64 `json:"rangePosition"`
	Trend         string   `json:"trend"` // "uptrend" | "downtrend" | "sideways" | "unknown"
}

const tradingDaysPerYear = 252

// computeMetrics derives trend, returns and volatility from a quote and its
// one-year daily closes (oldest first).
func computeMetrics(q quotes.Quote, daily []quotes.Point) Metrics {
	closes := make([]float64, 0, len(daily))
	for _, p := range daily {
		if p.P > 0 {
			closes = append(closes, p.P)
		}
	}
	m := Metrics{
		Price:         q.Price,
		ChangePercent: round(q.ChangePercent, 2),
		YearHigh:      q.YearHigh,
		YearLow:       q.YearLow,
		Trend:         "unknown",
	}

	m.Return1M = pctReturn(closes, 21, q.Price)
	m.Return3M = pctReturn(closes, 63, q.Price)
	if len(closes) > 0 {
		m.Return1Y = ptr(round((q.Price/closes[0]-1)*100, 1))
	}
	m.SMA50 = sma(closes, 50)
	m.SMA200 = sma(closes, 200)
	m.Volatility30D = realizedVol(closes, 30)
	if span := q.YearHigh - q.YearLow; span > 0 {
		m.RangePosition = ptr(round((q.Price-q.YearLow)/span*100, 0))
	}

	switch {
	case m.SMA50 == nil:
	case m.SMA200 != nil && q.Price > *m.SMA50 && *m.SMA50 > *m.SMA200:
		m.Trend = "uptrend"
	case m.SMA200 != nil && q.Price < *m.SMA50 && *m.SMA50 < *m.SMA200:
		m.Trend = "downtrend"
	default:
		m.Trend = "sideways"
	}
	return m
}

// pctReturn is the % change from the close `bars` sessions ago to price.
func pctReturn(closes []float64, bars int, price float64) *float64 {
	if len(closes) <= bars {
		return nil
	}
	return ptr(round((price/closes[len(closes)-1-bars]-1)*100, 1))
}

func sma(closes []float64, n int) *float64 {
	if len(closes) < n {
		return nil
	}
	var sum float64
	for _, c := range closes[len(closes)-n:] {
		sum += c
	}
	return ptr(round(sum/float64(n), 2))
}

// realizedVol is the annualised standard deviation of the last n daily log returns, in %.
func realizedVol(closes []float64, n int) *float64 {
	if len(closes) < n+1 {
		return nil
	}
	window := closes[len(closes)-n-1:]
	rets := make([]float64, n)
	var mean float64
	for i := range rets {
		rets[i] = math.Log(window[i+1] / window[i])
		mean += rets[i]
	}
	mean /= float64(n)
	var variance float64
	for _, r := range rets {
		variance += (r - mean) * (r - mean)
	}
	variance /= float64(n - 1)
	return ptr(round(math.Sqrt(variance*tradingDaysPerYear)*100, 1))
}

func round(v float64, digits int) float64 {
	p := math.Pow(10, float64(digits))
	return math.Round(v*p) / p
}

func ptr(v float64) *float64 { return &v }

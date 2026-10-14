package insights

import (
	"errors"
	"testing"

	"optiontrading/backend/internal/quotes"
)

func TestComputeMetricsUptrend(t *testing.T) {
	var pts []quotes.Point
	for i := 0; i < 252; i++ {
		pts = append(pts, quotes.Point{T: int64(i), P: 100 + float64(i)*0.2})
	}
	m := computeMetrics(quotes.Quote{Price: 151, YearHigh: 151, YearLow: 100}, pts)
	if m.Trend != "uptrend" {
		t.Errorf("trend = %q, want uptrend", m.Trend)
	}
	if m.SMA50 == nil || m.SMA200 == nil || m.Volatility30D == nil || m.Return1M == nil {
		t.Fatalf("missing metrics: %+v", m)
	}
	if *m.RangePosition != 100 {
		t.Errorf("range position = %v, want 100", *m.RangePosition)
	}
}

func TestComputeMetricsWithoutHistory(t *testing.T) {
	m := computeMetrics(quotes.Quote{Price: 10}, nil)
	if m.Trend != "unknown" || m.SMA50 != nil || m.Volatility30D != nil {
		t.Errorf("want empty metrics, got %+v", m)
	}
}

func TestParseAnswer(t *testing.T) {
	a, err := parseAnswer("```json\n{\"rating\":\"MEDIUM\",\"outlook\":\"sideways\"}\n```")
	if err != nil {
		t.Fatal(err)
	}
	if a.Rating != RatingMedium || a.Outlook != "neutral" || a.Reasons == nil {
		t.Errorf("normalised answer = %+v", a)
	}
	if _, err := parseAnswer(`{"rating":"excellent"}`); !errors.Is(err, ErrBadAnswer) {
		t.Errorf("unknown rating err = %v, want ErrBadAnswer", err)
	}
	if _, err := parseAnswer("no json here"); !errors.Is(err, ErrBadAnswer) {
		t.Errorf("no json err = %v, want ErrBadAnswer", err)
	}
}

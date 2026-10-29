package campaigns

import (
	"math"
	"time"
)

// Metrics are the dashboard figures derived from a campaign's capital, goal,
// earnings and dates.
type Metrics struct {
	NetTarget       float64 `json:"netTarget"`       // goal - capital
	TargetReturnPct float64 `json:"targetReturnPct"` // net target as % of capital
	MonthlyTarget   float64 `json:"monthlyTarget"`
	WeeklyTarget    float64 `json:"weeklyTarget"`
	TotalDays       int     `json:"totalDays"`
	DayNumber       int     `json:"dayNumber"`   // 1-based, clamped to the campaign
	ProgressPct     float64 `json:"progressPct"` // time elapsed, 0-100
	ExpectedEarned  float64 `json:"expectedEarned"`
	AheadBy         float64 `json:"aheadBy"` // earned - expected (negative = behind)
	Phase           string  `json:"phase"`   // upcoming | running | ended
}

const dateLayout = "2006-01-02"

// MetricsAt computes Metrics for the campaign as of now. Dates that don't
// parse leave the time-based figures at zero.
func (c Campaign) MetricsAt(now time.Time) Metrics {
	m := Metrics{NetTarget: math.Max(0, c.Goal-c.Capital)}
	if c.Capital > 0 {
		m.TargetReturnPct = round(m.NetTarget/c.Capital*100, 2)
	}

	start, err1 := time.Parse(dateLayout, c.StartDate)
	end, err2 := time.Parse(dateLayout, c.EndDate)
	if err1 != nil || err2 != nil || end.Before(start) {
		return m
	}
	m.TotalDays = int(end.Sub(start).Hours()/24) + 1
	months := math.Max(1, float64(m.TotalDays)/(365.25/12))
	weeks := math.Max(1, float64(m.TotalDays)/7)
	m.MonthlyTarget = round(m.NetTarget/math.Round(months), 2)
	m.WeeklyTarget = round(m.NetTarget/weeks, 2)

	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	elapsed := int(today.Sub(start).Hours()/24) + 1
	switch {
	case elapsed < 1:
		m.Phase, m.DayNumber = "upcoming", 0
	case elapsed > m.TotalDays:
		m.Phase, m.DayNumber = "ended", m.TotalDays
	default:
		m.Phase, m.DayNumber = "running", elapsed
	}
	m.ProgressPct = round(float64(m.DayNumber)/float64(m.TotalDays)*100, 1)
	m.ExpectedEarned = round(m.NetTarget*float64(m.DayNumber)/float64(m.TotalDays), 2)
	m.AheadBy = round(c.Earned-m.ExpectedEarned, 2)
	return m
}

func round(v float64, digits int) float64 {
	p := math.Pow(10, float64(digits))
	return math.Round(v*p) / p
}

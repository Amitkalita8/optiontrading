package campaigns

import (
	"testing"
	"time"
)

func TestMetricsAt(t *testing.T) {
	c := Campaign{Capital: 1000000, Goal: 1200000, Earned: 32179, StartDate: "2026-01-01", EndDate: "2026-12-31"}
	m := c.MetricsAt(time.Date(2026, 2, 23, 15, 0, 0, 0, time.UTC)) // day 54

	if m.NetTarget != 200000 || m.TargetReturnPct != 20 {
		t.Errorf("targets = %v / %v", m.NetTarget, m.TargetReturnPct)
	}
	if m.MonthlyTarget != 16666.67 {
		t.Errorf("monthly = %v, want 16666.67", m.MonthlyTarget)
	}
	if m.TotalDays != 365 || m.DayNumber != 54 || m.Phase != "running" {
		t.Errorf("days = %d of %d (%s)", m.DayNumber, m.TotalDays, m.Phase)
	}
	if want := 32179 - 200000.0*54/365; m.AheadBy < want-0.01 || m.AheadBy > want+0.01 {
		t.Errorf("aheadBy = %v, want ≈%v", m.AheadBy, want)
	}

	if m := c.MetricsAt(time.Date(2025, 12, 1, 0, 0, 0, 0, time.UTC)); m.Phase != "upcoming" || m.DayNumber != 0 {
		t.Errorf("before start: %+v", m)
	}
	if m := c.MetricsAt(time.Date(2027, 3, 1, 0, 0, 0, 0, time.UTC)); m.Phase != "ended" || m.ProgressPct != 100 {
		t.Errorf("after end: %+v", m)
	}
	if m := (Campaign{Capital: 1, Goal: 2, StartDate: "bad", EndDate: "x"}).MetricsAt(time.Now()); m.TotalDays != 0 {
		t.Errorf("bad dates should leave time figures empty: %+v", m)
	}
}

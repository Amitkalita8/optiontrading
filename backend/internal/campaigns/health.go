package campaigns

// Health is the campaign's status for display, derived from what the user
// set (paused / completed) and how it is doing against plan.
const (
	HealthOnTrack   = "on_track"
	HealthBehind    = "behind"
	HealthPaused    = "paused"
	HealthCompleted = "completed"
	HealthUpcoming  = "upcoming"
)

// HealthAt classifies the campaign given its metrics.
func (c Campaign) HealthAt(m Metrics) string {
	switch {
	case c.Status == "paused":
		return HealthPaused
	case c.Status == "completed", m.Phase == "ended":
		return HealthCompleted
	case m.Phase == "upcoming":
		return HealthUpcoming
	case c.Status == "behind", c.Status == "at risk":
		return HealthBehind
	case m.TotalDays > 0 && m.AheadBy < 0:
		return HealthBehind
	default:
		return HealthOnTrack
	}
}

// MonthlyRunRate is earnings per elapsed month (0 before the start).
func (m Metrics) MonthlyRunRate(earned float64) float64 {
	if m.DayNumber <= 0 {
		return 0
	}
	months := float64(m.DayNumber) / (365.25 / 12)
	if months < 1 {
		months = 1
	}
	return round(earned/months, 2)
}

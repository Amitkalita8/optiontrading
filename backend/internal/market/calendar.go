// Package market knows the US equity (NYSE/Nasdaq) trading calendar.
package market

import (
	"fmt"
	"time"
)

// NewYork is the exchange time zone. Callers must embed tzdata (see cmd/server)
// so this also works on Windows machines without a zoneinfo database.
var NewYork = mustLoad("America/New_York")

func mustLoad(name string) *time.Location {
	loc, err := time.LoadLocation(name)
	if err != nil {
		panic(fmt.Sprintf("market: load time zone %s: %v", name, err))
	}
	return loc
}

// Regular and extended session times, New York local.
var (
	regularOpen   = clock{9, 30}
	regularClose  = clock{16, 0}
	earlyClose    = clock{13, 0}
	preMarketOpen = clock{4, 0}
	afterHoursEnd = clock{20, 0}
)

type clock struct{ hour, min int }

func (c clock) on(day time.Time) time.Time {
	return time.Date(day.Year(), day.Month(), day.Day(), c.hour, c.min, 0, 0, NewYork)
}

// Full-day closures. Source: NYSE holiday calendar. Extend this list each year;
// dates beyond it are treated as normal weekdays.
var holidays = map[string]string{
	"2026-01-01": "New Year's Day",
	"2026-01-19": "Martin Luther King Jr. Day",
	"2026-02-16": "Washington's Birthday",
	"2026-04-03": "Good Friday",
	"2026-05-25": "Memorial Day",
	"2026-06-19": "Juneteenth",
	"2026-07-03": "Independence Day (observed)",
	"2026-09-07": "Labor Day",
	"2026-11-26": "Thanksgiving Day",
	"2026-12-25": "Christmas Day",
	"2027-01-01": "New Year's Day",
	"2027-01-18": "Martin Luther King Jr. Day",
	"2027-02-15": "Washington's Birthday",
	"2027-03-26": "Good Friday",
	"2027-05-31": "Memorial Day",
	"2027-06-18": "Juneteenth (observed)",
	"2027-07-05": "Independence Day (observed)",
	"2027-09-06": "Labor Day",
	"2027-11-25": "Thanksgiving Day",
	"2027-12-24": "Christmas Day (observed)",
}

// Days the market closes early at 1:00 PM ET.
var earlyCloses = map[string]bool{
	"2026-11-27": true,
	"2026-12-24": true,
	"2027-11-26": true,
}

// Phase of the trading day.
const (
	PhasePreMarket  = "pre-market"  // 4:00–9:30 ET on a trading day
	PhaseOpen       = "open"        // regular session
	PhaseAfterHours = "after-hours" // close–20:00 ET on a trading day
	PhaseClosed     = "closed"      // overnight, weekends, holidays
)

// Status describes the market at a moment, with the next session boundaries.
type Status struct {
	IsOpen bool   `json:"isOpen"`
	Phase  string `json:"phase"`
	// Now is the time the status was computed for.
	Now time.Time `json:"now"`
	// NextOpen is the start of the next regular session (in the future).
	NextOpen time.Time `json:"nextOpen"`
	// NextClose is the end of the current session if open, otherwise of the
	// next session.
	NextClose time.Time `json:"nextClose"`
	// EarlyClose is true when the session NextClose belongs to ends at 1 PM.
	EarlyClose bool `json:"earlyClose"`
	// Holiday names today's closure, if any.
	Holiday  string `json:"holiday,omitempty"`
	Timezone string `json:"timezone"`
}

// session returns the regular-session bounds for the New York calendar day
// containing t, or ok=false (with the holiday name, if any) when closed.
func session(t time.Time) (open, close time.Time, early bool, holiday string, ok bool) {
	day := t.In(NewYork)
	if wd := day.Weekday(); wd == time.Saturday || wd == time.Sunday {
		return time.Time{}, time.Time{}, false, "", false
	}
	key := day.Format("2006-01-02")
	if name, closed := holidays[key]; closed {
		return time.Time{}, time.Time{}, false, name, false
	}
	early = earlyCloses[key]
	end := regularClose
	if early {
		end = earlyClose
	}
	return regularOpen.on(day), end.on(day), early, "", true
}

// nextSession finds the first regular session that opens strictly after t.
func nextSession(t time.Time) (open, close time.Time, early bool) {
	day := t.In(NewYork)
	for i := 0; i < 15; i++ {
		if o, c, e, _, ok := session(day); ok && o.After(t) {
			return o, c, e
		}
		day = time.Date(day.Year(), day.Month(), day.Day()+1, 12, 0, 0, 0, NewYork)
	}
	// Unreachable with a sane calendar (no 15-day closures).
	return time.Time{}, time.Time{}, false
}

// StatusAt reports the market status at t.
func StatusAt(t time.Time) Status {
	t = t.In(NewYork)
	s := Status{Now: t, Timezone: NewYork.String(), Phase: PhaseClosed}

	open, close, early, holiday, tradingDay := session(t)
	s.Holiday = holiday

	switch {
	case tradingDay && !t.Before(open) && t.Before(close):
		s.IsOpen, s.Phase = true, PhaseOpen
		s.NextClose, s.EarlyClose = close, early
		s.NextOpen, _, _ = nextSession(close)
		return s
	case tradingDay && t.Before(open) && !t.Before(preMarketOpen.on(t)):
		s.Phase = PhasePreMarket
	case tradingDay && !t.Before(close) && t.Before(afterHoursEnd.on(t)):
		s.Phase = PhaseAfterHours
	}

	s.NextOpen, s.NextClose, s.EarlyClose = nextSession(t)
	return s
}

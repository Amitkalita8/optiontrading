package market

import (
	"testing"
	"time"
)

func ny(s string) time.Time {
	t, err := time.ParseInLocation("2006-01-02 15:04", s, NewYork)
	if err != nil {
		panic(err)
	}
	return t
}

func TestStatusAt(t *testing.T) {
	tests := []struct {
		name      string
		at        string
		phase     string
		nextOpen  string
		nextClose string
		early     bool
		holiday   string
	}{
		{"open midday", "2026-10-07 11:00", PhaseOpen, "2026-10-08 09:30", "2026-10-07 16:00", false, ""},
		{"exactly at open", "2026-10-07 09:30", PhaseOpen, "2026-10-08 09:30", "2026-10-07 16:00", false, ""},
		{"exactly at close", "2026-10-07 16:00", PhaseAfterHours, "2026-10-08 09:30", "2026-10-08 16:00", false, ""},
		{"pre-market", "2026-10-07 08:00", PhasePreMarket, "2026-10-07 09:30", "2026-10-07 16:00", false, ""},
		{"overnight", "2026-10-07 22:30", PhaseClosed, "2026-10-08 09:30", "2026-10-08 16:00", false, ""},
		{"friday after hours to monday", "2026-10-09 17:00", PhaseAfterHours, "2026-10-12 09:30", "2026-10-12 16:00", false, ""},
		{"saturday", "2026-10-10 12:00", PhaseClosed, "2026-10-12 09:30", "2026-10-12 16:00", false, ""},
		{"thanksgiving holiday", "2026-11-26 12:00", PhaseClosed, "2026-11-27 09:30", "2026-11-27 13:00", true, "Thanksgiving Day"},
		{"early close day open", "2026-11-27 12:00", PhaseOpen, "2026-11-30 09:30", "2026-11-27 13:00", true, ""},
		{"early close day after", "2026-11-27 13:30", PhaseAfterHours, "2026-11-30 09:30", "2026-11-30 16:00", false, ""},
		{"christmas eve to after christmas", "2026-12-24 15:00", PhaseAfterHours, "2026-12-28 09:30", "2026-12-28 16:00", false, ""},
		{"good friday long weekend", "2026-04-02 18:00", PhaseAfterHours, "2026-04-06 09:30", "2026-04-06 16:00", false, ""},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			s := StatusAt(ny(tc.at))
			if s.Phase != tc.phase {
				t.Errorf("phase = %q, want %q", s.Phase, tc.phase)
			}
			if s.IsOpen != (tc.phase == PhaseOpen) {
				t.Errorf("isOpen = %v for phase %q", s.IsOpen, s.Phase)
			}
			if !s.NextOpen.Equal(ny(tc.nextOpen)) {
				t.Errorf("nextOpen = %s, want %s", s.NextOpen.Format("2006-01-02 15:04"), tc.nextOpen)
			}
			if !s.NextClose.Equal(ny(tc.nextClose)) {
				t.Errorf("nextClose = %s, want %s", s.NextClose.Format("2006-01-02 15:04"), tc.nextClose)
			}
			if s.EarlyClose != tc.early {
				t.Errorf("earlyClose = %v, want %v", s.EarlyClose, tc.early)
			}
			if s.Holiday != tc.holiday {
				t.Errorf("holiday = %q, want %q", s.Holiday, tc.holiday)
			}
		})
	}
}

func TestStatusAtAcrossDST(t *testing.T) {
	// US DST ends 2026-11-01; the open must stay at 9:30 New York time.
	s := StatusAt(ny("2026-10-30 18:00"))
	if got := s.NextOpen.In(NewYork).Format("2006-01-02 15:04 MST"); got != "2026-11-02 09:30 EST" {
		t.Errorf("nextOpen = %s, want 2026-11-02 09:30 EST", got)
	}
}

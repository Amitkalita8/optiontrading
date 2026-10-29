package campaigns

import "testing"

func TestFromTemplate(t *testing.T) {
	s := FromTemplate([]string{"Cash-Secured Put", "Bull Put Spread", "Calendar Spread"}, "ATM", "7-14d", "lower")
	if got := *s.Strategies; len(got) != 1 || got[0] != "csp" {
		t.Errorf("strategies = %v, want [csp]", got)
	}
	if s.Moneyness != "ATM" || s.HoldingDuration != "1-4w" || s.Risk != "low" {
		t.Errorf("mapped = %+v", s)
	}
	// Nothing mappable falls back to defaults.
	d := FromTemplate([]string{"Calendar Spread"}, "??", "", "")
	if (*d.Strategies)[0] != "covered_call" || d.Moneyness != "OTM" || d.HoldingDuration != "1-4w" || d.Risk != "moderate" {
		t.Errorf("defaults = %+v", d)
	}
	if errs := (Settings{Strategies: d.Strategies, Moneyness: d.Moneyness, HoldingDuration: d.HoldingDuration, Risk: d.Risk}).Validate(); len(errs) != 0 {
		t.Errorf("template output should validate: %v", errs)
	}
}

package campaigns

import (
	"encoding/json"
	"strings"
)

// Choice is a stored value and its display label.
type Choice struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

// SettingOptions are the choices for a campaign's approach settings
// (dashboard › Campaign Approach).
type SettingOptions struct {
	Strategies       []Choice `json:"strategies"`
	Moneyness        []Choice `json:"moneyness"`
	HoldingDurations []Choice `json:"holdingDurations"`
	Outlooks         []Choice `json:"outlooks"`
	Risks            []Choice `json:"risks"`
}

var Options = SettingOptions{
	Strategies: []Choice{
		{"covered_call", "Covered Call"},
		{"csp", "CSP"},
		{"iron_condor", "Iron Condor"},
		{"straddle", "Straddle"},
		{"strangle", "Strangle"},
	},
	Moneyness:        []Choice{{"OTM", "OTM"}, {"ATM", "ATM"}, {"ITM", "ITM"}},
	HoldingDurations: []Choice{{"intraday", "Intraday"}, {"1-7d", "1-7 Days"}, {"1-4w", "1-4 Weeks"}, {"1m+", "1+ Month"}},
	Outlooks:         []Choice{{"bullish", "Bullish"}, {"bearish", "Bearish"}, {"neutral", "Neutral"}},
	Risks:            []Choice{{"low", "Low"}, {"moderate", "Moderate"}, {"high", "High"}},
}

// Defaults for campaigns that have never set these.
var defaultStrategies = []string{"covered_call"}

const (
	defaultMoneyness = "OTM"
	defaultHolding   = "1-4w"
	defaultRisk      = "moderate"
)

func valid(list []Choice, v string) bool {
	for _, c := range list {
		if c.Value == v {
			return true
		}
	}
	return false
}

// Settings is a partial update of a campaign's approach settings and links.
// Nil / empty fields are left unchanged.
type Settings struct {
	ApproachID      *int64    `json:"approachId"`
	WatchlistID     *int64    `json:"watchlistId"`
	MarketOutlook   string    `json:"marketOutlook"`
	Strategies      *[]string `json:"strategies"`
	Moneyness       string    `json:"moneyness"`
	HoldingDuration string    `json:"holdingDuration"`
	Risk            string    `json:"risk"`
}

// Normalize lower-cases enum values and de-duplicates strategies.
func (s *Settings) Normalize() {
	s.MarketOutlook = strings.ToLower(strings.TrimSpace(s.MarketOutlook))
	s.Moneyness = strings.ToUpper(strings.TrimSpace(s.Moneyness))
	s.HoldingDuration = strings.ToLower(strings.TrimSpace(s.HoldingDuration))
	s.Risk = strings.ToLower(strings.TrimSpace(s.Risk))
	if s.Strategies != nil {
		seen := map[string]bool{}
		out := []string{}
		for _, v := range *s.Strategies {
			v = strings.ToLower(strings.TrimSpace(v))
			if v != "" && !seen[v] {
				seen[v] = true
				out = append(out, v)
			}
		}
		s.Strategies = &out
	}
}

// Validate returns field errors for any value outside the catalogue.
func (s Settings) Validate() FieldErrors {
	errs := FieldErrors{}
	if s.MarketOutlook != "" && !ValidOutlooks[s.MarketOutlook] {
		errs["marketOutlook"] = "Market outlook must be bullish, neutral or bearish."
	}
	if s.Moneyness != "" && !valid(Options.Moneyness, s.Moneyness) {
		errs["moneyness"] = "Moneyness must be OTM, ATM or ITM."
	}
	if s.HoldingDuration != "" && !valid(Options.HoldingDurations, s.HoldingDuration) {
		errs["holdingDuration"] = "Choose a holding duration."
	}
	if s.Risk != "" && !valid(Options.Risks, s.Risk) {
		errs["risk"] = "Risk must be low, moderate or high."
	}
	if s.Strategies != nil {
		if len(*s.Strategies) == 0 {
			errs["strategies"] = "Choose at least one strategy."
		}
		for _, v := range *s.Strategies {
			if !valid(Options.Strategies, v) {
				errs["strategies"] = "Unknown strategy: " + v
				break
			}
		}
	}
	return errs
}

// FromTemplate maps a saved trade approach onto campaign settings, for
// "Set Approach". Template strategies with no campaign equivalent are skipped.
func FromTemplate(strategies []string, moneyness, holdingPeriod, risk string) Settings {
	strategyMap := map[string]string{
		"Covered Call":     "covered_call",
		"Collar":           "covered_call",
		"Cash-Secured Put": "csp",
		"Bull Put Spread":  "csp",
		"Iron Condor":      "iron_condor",
		"Iron Butterfly":   "iron_condor",
		"Straddle":         "straddle",
		"Strangle":         "strangle",
	}
	var mapped []string
	seen := map[string]bool{}
	for _, s := range strategies {
		if v, ok := strategyMap[s]; ok && !seen[v] {
			seen[v] = true
			mapped = append(mapped, v)
		}
	}
	if len(mapped) == 0 {
		mapped = append(mapped, defaultStrategies...)
	}
	holding := map[string]string{"7-14d": "1-4w", "15-30d": "1-4w", "30-45d": "1m+", "60d+": "1m+"}[holdingPeriod]
	if holding == "" {
		holding = defaultHolding
	}
	riskLevel := map[string]string{"lower": "low", "moderate": "moderate", "aggressive": "high"}[risk]
	if riskLevel == "" {
		riskLevel = defaultRisk
	}
	if !valid(Options.Moneyness, moneyness) {
		moneyness = defaultMoneyness
	}
	return Settings{Strategies: &mapped, Moneyness: moneyness, HoldingDuration: holding, Risk: riskLevel}
}

func encodeStrategies(list []string) string {
	b, _ := json.Marshal(list)
	return string(b)
}

func decodeStrategies(raw string) []string {
	var out []string
	if json.Unmarshal([]byte(raw), &out) != nil || len(out) == 0 {
		return append([]string(nil), defaultStrategies...)
	}
	return out
}

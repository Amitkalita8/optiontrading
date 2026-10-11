// Package approaches manages trade approaches: the rules a campaign uses to
// discover trades (strategies, strikes, duration, yield, risk) and to manage
// open positions (take-profit, stop-loss, sizing, rolls).
package approaches

import (
	"slices"
	"strings"
	"time"
)

// Approach is a stored trade approach.
type Approach struct {
	ID int64 `json:"id"`
	Input
	// UsedInCampaigns counts campaigns using this approach (blocks deletion).
	UsedInCampaigns int       `json:"usedInCampaigns"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

// Input is the user-editable part of an approach (create/update body).
type Input struct {
	Name string `json:"name"`

	// Discovery preferences
	Strategies    []string `json:"strategies"`
	Moneyness     string   `json:"moneyness"`
	HoldingPeriod string   `json:"holdingPeriod"`
	MinYield      float64  `json:"minYield"` // %
	Risk          string   `json:"risk"`

	// Position management
	TakeProfit  float64 `json:"takeProfit"`  // % of max profit
	StopLoss    float64 `json:"stopLoss"`    // % loss
	MaxPosition float64 `json:"maxPosition"` // % of capital per underlying

	// Advanced parameters
	DTECloseThreshold  int    `json:"dteCloseThreshold"` // days; 0 = off
	AssignmentHandling string `json:"assignmentHandling"`
	AutoRoll           bool   `json:"autoRoll"`
}

// Choice is one selectable value and its display label.
type Choice struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

// Options are the allowed values, served to the frontend so both sides agree.
type Options struct {
	Strategies         []string  `json:"strategies"`
	Moneyness          []Choice  `json:"moneyness"`
	HoldingPeriods     []Choice  `json:"holdingPeriods"`
	Risks              []Choice  `json:"risks"`
	AssignmentHandling []Choice  `json:"assignmentHandling"`
	TakeProfitPresets  []float64 `json:"takeProfitPresets"`
	StopLossPresets    []float64 `json:"stopLossPresets"`
}

// AllOptions is the catalogue of valid choices.
var AllOptions = Options{
	Strategies: []string{
		"Covered Call", "Cash-Secured Put", "Bull Put Spread", "Bear Call Spread", "Iron Condor",
		"Bull Call Spread", "Bear Put Spread", "Credit Spread", "Iron Butterfly", "Butterfly Spread",
		"Calendar Spread", "Diagonal Spread", "Collar", "Straddle", "Strangle", "Protective Put",
	},
	Moneyness: []Choice{{"ITM", "ITM"}, {"ATM", "ATM"}, {"OTM", "OTM"}},
	HoldingPeriods: []Choice{
		{"7-14d", "7-14d"}, {"15-30d", "15-30d"}, {"30-45d", "30-45d"}, {"60d+", "60d+"},
	},
	Risks: []Choice{{"lower", "Lower Risk"}, {"moderate", "Moderate"}, {"aggressive", "Aggressive"}},
	AssignmentHandling: []Choice{
		{"roll", "Roll before expiry"},
		{"close", "Close before expiry"},
		{"accept", "Accept assignment"},
	},
	TakeProfitPresets: []float64{50, 75, 100},
	StopLossPresets:   []float64{10, 15, 20},
}

func hasChoice(choices []Choice, v string) bool {
	return slices.ContainsFunc(choices, func(c Choice) bool { return c.Value == v })
}

// FieldErrors maps a JSON field name to a human-readable problem.
type FieldErrors map[string]string

// Normalize trims text and removes duplicate strategies (keeping order).
func (in *Input) Normalize() {
	in.Name = strings.Join(strings.Fields(in.Name), " ")
	seen := map[string]bool{}
	out := in.Strategies[:0]
	for _, s := range in.Strategies {
		if !seen[s] {
			seen[s] = true
			out = append(out, s)
		}
	}
	in.Strategies = out
}

// Validate reports every invalid field (empty map = valid). Call Normalize first.
func (in Input) Validate() FieldErrors {
	errs := FieldErrors{}
	switch {
	case in.Name == "":
		errs["name"] = "Give the approach a name."
	case len(in.Name) > 80:
		errs["name"] = "Keep the name under 80 characters."
	}
	if len(in.Strategies) == 0 {
		errs["strategies"] = "Choose at least one strategy."
	}
	for _, s := range in.Strategies {
		if !slices.Contains(AllOptions.Strategies, s) {
			errs["strategies"] = "Unknown strategy: " + s
			break
		}
	}
	if !hasChoice(AllOptions.Moneyness, in.Moneyness) {
		errs["moneyness"] = "Choose ITM, ATM or OTM."
	}
	if !hasChoice(AllOptions.HoldingPeriods, in.HoldingPeriod) {
		errs["holdingPeriod"] = "Choose a holding duration."
	}
	if !hasChoice(AllOptions.Risks, in.Risk) {
		errs["risk"] = "Choose a risk classification."
	}
	if in.MinYield <= 0 || in.MinYield > 100 {
		errs["minYield"] = "Enter a yield between 0 and 100%."
	}
	if in.TakeProfit <= 0 || in.TakeProfit > 500 {
		errs["takeProfit"] = "Enter a take-profit between 1 and 500%."
	}
	if in.StopLoss <= 0 || in.StopLoss > 100 {
		errs["stopLoss"] = "Enter a stop-loss between 1 and 100%."
	}
	if in.MaxPosition <= 0 || in.MaxPosition > 100 {
		errs["maxPosition"] = "Enter a position size between 0 and 100%."
	}
	if in.DTECloseThreshold < 0 || in.DTECloseThreshold > 365 {
		errs["dteCloseThreshold"] = "Enter 0–365 days (0 turns it off)."
	}
	if !hasChoice(AllOptions.AssignmentHandling, in.AssignmentHandling) {
		errs["assignmentHandling"] = "Choose how to handle assignment."
	}
	return errs
}

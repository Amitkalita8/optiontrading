// Package campaigns manages structured trading programs (campaigns).
package campaigns

import (
	"errors"
	"strings"
	"time"
)

var (
	ErrNotFound      = errors.New("campaign not found")
	ErrDuplicateName = errors.New("a campaign with this name already exists")
)

// Campaign is a stored campaign.
type Campaign struct {
	ID         int64   `json:"id"`
	Name       string  `json:"name"`
	Capital    float64 `json:"capital"`
	Goal       float64 `json:"goal"`
	Earned     float64 `json:"earned"`
	Status     string  `json:"status"`
	StartDate  string  `json:"startDate"`
	EndDate    string  `json:"endDate"`
	ApproachID *int64  `json:"approachId,omitempty"`
	// WatchlistID is the list the campaign screens; MarketOutlook is the
	// trader's view for it (bullish | neutral | bearish).
	WatchlistID   *int64 `json:"watchlistId,omitempty"`
	MarketOutlook string `json:"marketOutlook"`
	// Approach settings shown on the dashboard (values from Options).
	Strategies      []string  `json:"strategies"`
	Moneyness       string    `json:"moneyness"`
	HoldingDuration string    `json:"holdingDuration"`
	Risk            string    `json:"risk"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

// Input is the user-editable part of a campaign.
type Input struct {
	Name       string  `json:"name"`
	Capital    float64 `json:"capital"`
	Goal       float64 `json:"goal"`
	Earned     float64 `json:"earned"`
	Status     string  `json:"status"`
	StartDate  string  `json:"startDate"` // YYYY-MM-DD
	EndDate    string  `json:"endDate"`   // YYYY-MM-DD
	ApproachID *int64  `json:"approachId"`
	// Optional on update: omitted keeps the current value.
	WatchlistID   *int64 `json:"watchlistId"`
	MarketOutlook string `json:"marketOutlook"`
}

// Summary is aggregate stats across all campaigns.
type Summary struct {
	Total             int     `json:"total"`
	TotalCapital      float64 `json:"totalCapital"`
	TotalEarned       float64 `json:"totalEarned"`
	TotalGoal         float64 `json:"totalGoal"`
	PortfolioYieldPct float64 `json:"portfolioYieldPct"`
}

// ValidOutlooks are the allowed market outlooks.
var ValidOutlooks = map[string]bool{"bullish": true, "neutral": true, "bearish": true}

// FieldErrors maps a JSON field name to a human-readable problem.
type FieldErrors map[string]string

var validStatuses = map[string]bool{
	"active":    true,
	"paused":    true,
	"completed": true,
	"on track":  true,
	"behind":    true,
	"at risk":   true,
}

// Normalize trims text fields.
func (in *Input) Normalize() {
	in.Name = strings.Join(strings.Fields(in.Name), " ")
	in.Status = strings.ToLower(strings.TrimSpace(in.Status))
	if in.Status == "" {
		in.Status = "active"
	}
	in.MarketOutlook = strings.ToLower(strings.TrimSpace(in.MarketOutlook))
}

// Validate returns field-level errors; empty map means valid.
func (in Input) Validate() FieldErrors {
	errs := FieldErrors{}
	switch {
	case in.Name == "":
		errs["name"] = "Give the campaign a name."
	case len(in.Name) > 100:
		errs["name"] = "Keep the name under 100 characters."
	}
	if in.Capital < 0 {
		errs["capital"] = "Capital must be 0 or more."
	}
	if in.Goal < 0 {
		errs["goal"] = "Goal must be 0 or more."
	}
	if !validStatuses[in.Status] {
		errs["status"] = "Status must be active, paused, or completed."
	}
	if in.StartDate == "" {
		errs["startDate"] = "Start date is required (YYYY-MM-DD)."
	}
	if in.EndDate == "" {
		errs["endDate"] = "End date is required (YYYY-MM-DD)."
	}
	if in.MarketOutlook != "" && !ValidOutlooks[in.MarketOutlook] {
		errs["marketOutlook"] = "Market outlook must be bullish, neutral or bearish."
	}
	return errs
}

// Error lets FieldErrors be returned as an error (e.g. from SetLinks).
func (e FieldErrors) Error() string { return "invalid campaign input" }

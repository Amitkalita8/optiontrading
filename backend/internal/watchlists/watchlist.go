// Package watchlists manages user-created lists of ticker symbols.
package watchlists

import (
	"errors"
	"strings"
	"time"
)

var (
	ErrNotFound      = errors.New("watchlist not found")
	ErrDuplicateName = errors.New("a watchlist with this name already exists")
)

// Watchlist is a stored watchlist with its current tickers.
type Watchlist struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Tickers   []string  `json:"tickers"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Input is the user-editable part of a watchlist.
type Input struct {
	Name    string   `json:"name"`
	Tickers []string `json:"tickers"`
}

// FieldErrors maps a JSON field name to a human-readable problem.
type FieldErrors map[string]string

// Normalize trims whitespace and uppercases tickers, removing duplicates.
func (in *Input) Normalize() {
	in.Name = strings.Join(strings.Fields(in.Name), " ")
	seen := map[string]bool{}
	out := []string{}
	for _, t := range in.Tickers {
		t = strings.ToUpper(strings.TrimSpace(t))
		if t != "" && !seen[t] {
			seen[t] = true
			out = append(out, t)
		}
	}
	in.Tickers = out
}

// Validate returns field-level errors; empty map means valid.
func (in Input) Validate() FieldErrors {
	errs := FieldErrors{}
	switch {
	case in.Name == "":
		errs["name"] = "Give the watchlist a name."
	case len(in.Name) > 80:
		errs["name"] = "Keep the name under 80 characters."
	}
	if len(in.Tickers) > 200 {
		errs["tickers"] = "A watchlist may contain at most 200 tickers."
	}
	return errs
}

// Package positions manages open option positions.
package positions

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

var ErrNotFound = errors.New("position not found")

// Leg is one option of a position as it was opened.
type Leg struct {
	Action   string  `json:"action"` // sell | buy
	Type     string  `json:"type"`   // call | put
	Strike   float64 `json:"strike"`
	Premium  float64 `json:"premium"` // per share at entry
	Contract string  `json:"contract,omitempty"`
}

// Position represents one open or closed option position.
type Position struct {
	ID            int64     `json:"id"`
	CampaignID    *int64    `json:"campaignId,omitempty"`
	Symbol        string    `json:"symbol"`
	Strategy      string    `json:"strategy"`
	Quantity      int       `json:"quantity"`
	Strike        float64   `json:"strike"`
	Expiry        string    `json:"expiry"`
	PremiumCredit float64   `json:"premiumCredit"` // credit per contract set, $
	CurrentValue  float64   `json:"currentValue"`  // cost to close per contract set, $
	UnrealizedPL  float64   `json:"unrealizedPL"`
	Status        string    `json:"status"`
	OpenedAt      string    `json:"openedAt"`
	ClosedAt      *string   `json:"closedAt,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`

	// Entry assumptions (Engine 02 compares the position against them).
	Legs          []Leg   `json:"legs"`
	EntryPrice    float64 `json:"entryPrice"` // underlying at entry
	EntryIV       float64 `json:"entryIV"`    // fraction
	EntryDelta    float64 `json:"entryDelta"` // |delta| of the main short leg
	EntryPOP      float64 `json:"entryPOP"`   // percent
	OpportunityID string  `json:"opportunityId,omitempty"`
	RolledFrom    *int64  `json:"rolledFrom,omitempty"`
}

// Input is the user-editable part of a position. On update, zero values of
// the entry fields (and nil Legs) keep what is stored.
type Input struct {
	CampaignID    *int64  `json:"campaignId"`
	Symbol        string  `json:"symbol"`
	Strategy      string  `json:"strategy"`
	Quantity      int     `json:"quantity"`
	Strike        float64 `json:"strike"`
	Expiry        string  `json:"expiry"`
	PremiumCredit float64 `json:"premiumCredit"`
	CurrentValue  float64 `json:"currentValue"`
	Status        string  `json:"status"`
	OpenedAt      string  `json:"openedAt"`
	ClosedAt      *string `json:"closedAt"`

	Legs          []Leg   `json:"legs"`
	EntryPrice    float64 `json:"entryPrice"`
	EntryIV       float64 `json:"entryIV"`
	EntryDelta    float64 `json:"entryDelta"`
	EntryPOP      float64 `json:"entryPOP"`
	OpportunityID string  `json:"opportunityId"`
	RolledFrom    *int64  `json:"rolledFrom"`
}

type Repository struct {
	db  *sql.DB
	now func() time.Time
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, now: time.Now}
}

const selectCols = `id, campaign_id, symbol, strategy, quantity, strike, expiry,
	premium_credit, current_value, status, opened_at, closed_at, created_at, updated_at,
	legs, entry_price, entry_iv, entry_delta, entry_pop, opportunity_id, rolled_from`

type scanner interface{ Scan(dest ...any) error }

func scanPosition(row scanner) (Position, error) {
	var (
		p                    Position
		campaignID           sql.NullInt64
		rolledFrom           sql.NullInt64
		closedAt             sql.NullString
		createdAt, updatedAt string
		legs                 string
	)
	err := row.Scan(&p.ID, &campaignID, &p.Symbol, &p.Strategy, &p.Quantity, &p.Strike, &p.Expiry,
		&p.PremiumCredit, &p.CurrentValue, &p.Status, &p.OpenedAt, &closedAt, &createdAt, &updatedAt,
		&legs, &p.EntryPrice, &p.EntryIV, &p.EntryDelta, &p.EntryPOP, &p.OpportunityID, &rolledFrom)
	if err != nil {
		return Position{}, err
	}
	if campaignID.Valid {
		p.CampaignID = &campaignID.Int64
	}
	if rolledFrom.Valid {
		p.RolledFrom = &rolledFrom.Int64
	}
	if closedAt.Valid {
		p.ClosedAt = &closedAt.String
	}
	p.Legs = []Leg{}
	if legs != "" {
		_ = json.Unmarshal([]byte(legs), &p.Legs)
	}
	p.UnrealizedPL = (p.PremiumCredit - p.CurrentValue) * float64(p.Quantity)
	p.CreatedAt, _ = time.Parse(time.RFC3339Nano, createdAt)
	p.UpdatedAt, _ = time.Parse(time.RFC3339Nano, updatedAt)
	return p, nil
}

func (r *Repository) list(ctx context.Context, where string, args ...any) ([]Position, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT `+selectCols+` FROM positions WHERE `+where+` ORDER BY id DESC`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Position
	for rows.Next() {
		p, err := scanPosition(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *Repository) List(ctx context.Context, userID string) ([]Position, error) {
	return r.list(ctx, `user_id = ?`, userID)
}

// ListOpen returns the user's open positions.
func (r *Repository) ListOpen(ctx context.Context, userID string) ([]Position, error) {
	return r.list(ctx, `user_id = ? AND status = 'open'`, userID)
}

// OwnedPosition is an open position with its owner, for background jobs.
type OwnedPosition struct {
	UserID string
	Position
}

// ListOpenAll returns every user's open positions.
func (r *Repository) ListOpenAll(ctx context.Context) ([]OwnedPosition, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT user_id, `+selectCols+` FROM positions WHERE status = 'open' ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []OwnedPosition
	for rows.Next() {
		var uid string
		p, err := scanPosition(prefixScanner{rows, &uid})
		if err != nil {
			return nil, err
		}
		out = append(out, OwnedPosition{uid, p})
	}
	return out, rows.Err()
}

type prefixScanner struct {
	row   scanner
	first *string
}

func (p prefixScanner) Scan(dest ...any) error { return p.row.Scan(append([]any{p.first}, dest...)...) }

func (r *Repository) Get(ctx context.Context, id int64, userID string) (Position, error) {
	p, err := scanPosition(r.db.QueryRowContext(ctx,
		`SELECT `+selectCols+` FROM positions WHERE id = ? AND user_id = ?`, id, userID))
	if errors.Is(err, sql.ErrNoRows) {
		return Position{}, ErrNotFound
	}
	return p, err
}

func encodeLegs(legs []Leg) string {
	if len(legs) == 0 {
		return ""
	}
	b, _ := json.Marshal(legs)
	return string(b)
}

func nullableID(id *int64) any {
	if id == nil {
		return nil
	}
	return *id
}

func (r *Repository) Create(ctx context.Context, in Input, userID string) (Position, error) {
	now := r.now().UTC().Format(time.RFC3339Nano)
	openedAt := in.OpenedAt
	if openedAt == "" {
		openedAt = r.now().UTC().Format("2006-01-02")
	}
	status := in.Status
	if status == "" {
		status = "open"
	}
	if in.Strike == 0 {
		in.Strike = MainStrike(in.Legs)
	}
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO positions (user_id, campaign_id, symbol, strategy, quantity, strike, expiry,
		 premium_credit, current_value, status, opened_at, closed_at, created_at, updated_at,
		 legs, entry_price, entry_iv, entry_delta, entry_pop, opportunity_id, rolled_from)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		userID, nullableID(in.CampaignID), strings.ToUpper(in.Symbol), in.Strategy, in.Quantity, in.Strike, in.Expiry,
		in.PremiumCredit, in.CurrentValue, status, openedAt, in.ClosedAt, now, now,
		encodeLegs(in.Legs), in.EntryPrice, in.EntryIV, in.EntryDelta, in.EntryPOP, in.OpportunityID, nullableID(in.RolledFrom))
	if err != nil {
		return Position{}, err
	}
	id, _ := res.LastInsertId()
	return r.Get(ctx, id, userID)
}

// Update replaces the position. Fields a partial request leaves empty keep
// their stored values (so {"status":"closed"} doesn't wipe the strike).
func (r *Repository) Update(ctx context.Context, id int64, in Input, userID string) (Position, error) {
	cur, err := r.Get(ctx, id, userID)
	if err != nil {
		return Position{}, err
	}
	if in.CampaignID == nil {
		in.CampaignID = cur.CampaignID
	}
	if in.Symbol == "" {
		in.Symbol = cur.Symbol
	}
	if in.Strategy == "" {
		in.Strategy = cur.Strategy
	}
	if in.Quantity == 0 {
		in.Quantity = cur.Quantity
	}
	if in.Strike == 0 {
		in.Strike = cur.Strike
	}
	if in.Expiry == "" {
		in.Expiry = cur.Expiry
	}
	if in.PremiumCredit == 0 {
		in.PremiumCredit = cur.PremiumCredit
	}
	if in.Status == "" {
		in.Status = cur.Status
	}
	if in.OpenedAt == "" {
		in.OpenedAt = cur.OpenedAt
	}
	if in.ClosedAt == nil {
		in.ClosedAt = cur.ClosedAt
	}
	if in.Legs == nil {
		in.Legs = cur.Legs
	}
	if in.EntryPrice == 0 {
		in.EntryPrice = cur.EntryPrice
	}
	if in.EntryIV == 0 {
		in.EntryIV = cur.EntryIV
	}
	if in.EntryDelta == 0 {
		in.EntryDelta = cur.EntryDelta
	}
	if in.EntryPOP == 0 {
		in.EntryPOP = cur.EntryPOP
	}
	if in.OpportunityID == "" {
		in.OpportunityID = cur.OpportunityID
	}
	if in.RolledFrom == nil {
		in.RolledFrom = cur.RolledFrom
	}
	now := r.now().UTC().Format(time.RFC3339Nano)
	_, err = r.db.ExecContext(ctx,
		`UPDATE positions SET campaign_id=?, symbol=?, strategy=?, quantity=?, strike=?, expiry=?,
		 premium_credit=?, current_value=?, status=?, opened_at=?, closed_at=?, updated_at=?,
		 legs=?, entry_price=?, entry_iv=?, entry_delta=?, entry_pop=?, opportunity_id=?, rolled_from=?
		 WHERE id = ? AND user_id = ?`,
		nullableID(in.CampaignID), strings.ToUpper(in.Symbol), in.Strategy, in.Quantity, in.Strike, in.Expiry,
		in.PremiumCredit, in.CurrentValue, in.Status, in.OpenedAt, in.ClosedAt, now,
		encodeLegs(in.Legs), in.EntryPrice, in.EntryIV, in.EntryDelta, in.EntryPOP, in.OpportunityID, nullableID(in.RolledFrom),
		id, userID)
	if err != nil {
		return Position{}, err
	}
	return r.Get(ctx, id, userID)
}

// SetMark stores the latest cost to close (per contract set).
func (r *Repository) SetMark(ctx context.Context, id int64, userID string, value float64) error {
	_, err := r.db.ExecContext(ctx, `UPDATE positions SET current_value = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
		value, r.now().UTC().Format(time.RFC3339Nano), id, userID)
	return err
}

// SetEntry back-fills reconstructed entry assumptions for older positions.
func (r *Repository) SetEntry(ctx context.Context, id int64, userID string, legs []Leg, price, iv, delta, pop float64) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE positions SET legs = CASE WHEN legs = '' THEN ? ELSE legs END,
		   entry_price = CASE WHEN entry_price = 0 THEN ? ELSE entry_price END,
		   entry_iv = CASE WHEN entry_iv = 0 THEN ? ELSE entry_iv END,
		   entry_delta = CASE WHEN entry_delta = 0 THEN ? ELSE entry_delta END,
		   entry_pop = CASE WHEN entry_pop = 0 THEN ? ELSE entry_pop END
		 WHERE id = ? AND user_id = ?`, encodeLegs(legs), price, iv, delta, pop, id, userID)
	return err
}

func (r *Repository) Delete(ctx context.Context, id int64, userID string) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM positions WHERE id = ? AND user_id = ?`, id, userID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// MainStrike is the strike of the first short leg (what the list shows).
func MainStrike(legs []Leg) float64 {
	for _, l := range legs {
		if l.Action == "sell" {
			return l.Strike
		}
	}
	if len(legs) > 0 {
		return legs[0].Strike
	}
	return 0
}

// SeedDemo inserts demo positions if the table is empty.
func (r *Repository) SeedDemo(ctx context.Context) error {
	var n int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM positions`).Scan(&n); err != nil || n > 0 {
		return err
	}
	demos := []Input{
		{Symbol: "AAPL", Strategy: "Covered Call", Quantity: 2, Strike: 230, Expiry: "2026-11-20", PremiumCredit: 450, CurrentValue: 120, Status: "open", OpenedAt: "2026-10-01"},
		{Symbol: "MSFT", Strategy: "Cash-Secured Put", Quantity: 1, Strike: 410, Expiry: "2026-11-15", PremiumCredit: 380, CurrentValue: 90, Status: "open", OpenedAt: "2026-10-05"},
		{Symbol: "NVDA", Strategy: "Iron Condor", Quantity: 3, Strike: 125, Expiry: "2026-10-31", PremiumCredit: 620, CurrentValue: 210, Status: "open", OpenedAt: "2026-10-10"},
		{Symbol: "GOOGL", Strategy: "Covered Call", Quantity: 1, Strike: 185, Expiry: "2026-10-17", PremiumCredit: 290, CurrentValue: 0, Status: "closed", OpenedAt: "2026-09-15"},
	}
	for _, d := range demos {
		if _, err := r.Create(ctx, d, "default"); err != nil {
			return err
		}
	}
	return nil
}

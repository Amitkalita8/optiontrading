// Package positions manages open option positions.
package positions

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

var ErrNotFound = errors.New("position not found")

// Position represents one open or closed option position.
type Position struct {
	ID            int64     `json:"id"`
	CampaignID    *int64    `json:"campaignId,omitempty"`
	Symbol        string    `json:"symbol"`
	Strategy      string    `json:"strategy"`
	Quantity      int       `json:"quantity"`
	Strike        float64   `json:"strike"`
	Expiry        string    `json:"expiry"`
	PremiumCredit float64   `json:"premiumCredit"`
	CurrentValue  float64   `json:"currentValue"`
	UnrealizedPL  float64   `json:"unrealizedPL"`
	Status        string    `json:"status"`
	OpenedAt      string    `json:"openedAt"`
	ClosedAt      *string   `json:"closedAt,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// Input is the user-editable part of a position.
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
}

type Repository struct {
	db  *sql.DB
	now func() time.Time
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, now: time.Now}
}

const selectCols = `id, campaign_id, symbol, strategy, quantity, strike, expiry,
	premium_credit, current_value, status, opened_at, closed_at, created_at, updated_at`

type scanner interface{ Scan(dest ...any) error }

func scanPosition(row scanner) (Position, error) {
	var (
		p                    Position
		campaignID           sql.NullInt64
		closedAt             sql.NullString
		createdAt, updatedAt string
	)
	err := row.Scan(&p.ID, &campaignID, &p.Symbol, &p.Strategy, &p.Quantity, &p.Strike, &p.Expiry,
		&p.PremiumCredit, &p.CurrentValue, &p.Status, &p.OpenedAt, &closedAt, &createdAt, &updatedAt)
	if err != nil {
		return Position{}, err
	}
	if campaignID.Valid {
		p.CampaignID = &campaignID.Int64
	}
	if closedAt.Valid {
		p.ClosedAt = &closedAt.String
	}
	p.UnrealizedPL = (p.PremiumCredit - p.CurrentValue) * float64(p.Quantity)
	p.CreatedAt, _ = time.Parse(time.RFC3339Nano, createdAt)
	p.UpdatedAt, _ = time.Parse(time.RFC3339Nano, updatedAt)
	return p, nil
}

func (r *Repository) List(ctx context.Context, userID string) ([]Position, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT `+selectCols+` FROM positions WHERE user_id = ? ORDER BY id DESC`, userID)
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

func (r *Repository) Get(ctx context.Context, id int64, userID string) (Position, error) {
	p, err := scanPosition(r.db.QueryRowContext(ctx,
		`SELECT `+selectCols+` FROM positions WHERE id = ? AND user_id = ?`, id, userID))
	if errors.Is(err, sql.ErrNoRows) {
		return Position{}, ErrNotFound
	}
	return p, err
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
	var campaignID interface{}
	if in.CampaignID != nil {
		campaignID = *in.CampaignID
	}
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO positions (user_id, campaign_id, symbol, strategy, quantity, strike, expiry,
		 premium_credit, current_value, status, opened_at, closed_at, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		userID, campaignID, in.Symbol, in.Strategy, in.Quantity, in.Strike, in.Expiry,
		in.PremiumCredit, in.CurrentValue, status, openedAt, in.ClosedAt, now, now)
	if err != nil {
		return Position{}, err
	}
	id, _ := res.LastInsertId()
	return r.Get(ctx, id, userID)
}

func (r *Repository) Update(ctx context.Context, id int64, in Input, userID string) (Position, error) {
	now := r.now().UTC().Format(time.RFC3339Nano)
	var campaignID interface{}
	if in.CampaignID != nil {
		campaignID = *in.CampaignID
	}
	res, err := r.db.ExecContext(ctx,
		`UPDATE positions SET campaign_id=?, symbol=?, strategy=?, quantity=?, strike=?, expiry=?,
		 premium_credit=?, current_value=?, status=?, opened_at=?, closed_at=?, updated_at=?
		 WHERE id = ? AND user_id = ?`,
		campaignID, in.Symbol, in.Strategy, in.Quantity, in.Strike, in.Expiry,
		in.PremiumCredit, in.CurrentValue, in.Status, in.OpenedAt, in.ClosedAt, now, id, userID)
	if err != nil {
		return Position{}, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return Position{}, ErrNotFound
	}
	return r.Get(ctx, id, userID)
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


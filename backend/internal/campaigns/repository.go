package campaigns

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"
)

// Repository stores campaigns in SQLite.
type Repository struct {
	db  *sql.DB
	now func() time.Time
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, now: time.Now}
}

const selectCols = `id, name, capital, goal, earned, status, start_date, end_date, approach_id, created_at, updated_at`

type scanner interface{ Scan(dest ...any) error }

func scanCampaign(row scanner) (Campaign, error) {
	var (
		c                    Campaign
		approachID           sql.NullInt64
		createdAt, updatedAt string
	)
	err := row.Scan(&c.ID, &c.Name, &c.Capital, &c.Goal, &c.Earned, &c.Status,
		&c.StartDate, &c.EndDate, &approachID, &createdAt, &updatedAt)
	if err != nil {
		return Campaign{}, err
	}
	if approachID.Valid {
		c.ApproachID = &approachID.Int64
	}
	c.CreatedAt, _ = time.Parse(time.RFC3339Nano, createdAt)
	c.UpdatedAt, _ = time.Parse(time.RFC3339Nano, updatedAt)
	return c, nil
}

// List returns all campaigns for the user, newest first.
func (r *Repository) List(ctx context.Context, userID string) ([]Campaign, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT `+selectCols+` FROM campaigns WHERE user_id = ? ORDER BY id DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Campaign
	for rows.Next() {
		c, err := scanCampaign(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// Summarize returns aggregate stats across all campaigns for the user.
func (r *Repository) Summarize(ctx context.Context, userID string) (Summary, error) {
	var s Summary
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*), COALESCE(SUM(capital),0), COALESCE(SUM(earned),0), COALESCE(SUM(goal),0)
		 FROM campaigns WHERE user_id = ?`, userID).
		Scan(&s.Total, &s.TotalCapital, &s.TotalEarned, &s.TotalGoal)
	if err != nil {
		return s, err
	}
	if s.TotalCapital > 0 {
		s.PortfolioYieldPct = s.TotalEarned / s.TotalCapital * 100
	}
	return s, nil
}

// Get returns a single campaign.
func (r *Repository) Get(ctx context.Context, id int64, userID string) (Campaign, error) {
	c, err := scanCampaign(r.db.QueryRowContext(ctx,
		`SELECT `+selectCols+` FROM campaigns WHERE id = ? AND user_id = ?`, id, userID))
	if errors.Is(err, sql.ErrNoRows) {
		return Campaign{}, ErrNotFound
	}
	return c, err
}

// Create inserts a new campaign.
func (r *Repository) Create(ctx context.Context, in Input, userID string) (Campaign, error) {
	now := r.now().UTC().Format(time.RFC3339Nano)
	var approachID interface{}
	if in.ApproachID != nil {
		approachID = *in.ApproachID
	}
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO campaigns (user_id, name, capital, goal, earned, status, start_date, end_date, approach_id, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		userID, in.Name, in.Capital, in.Goal, in.Earned, in.Status,
		in.StartDate, in.EndDate, approachID, now, now)
	if err != nil {
		return Campaign{}, mapCampaignError(err)
	}
	id, _ := res.LastInsertId()
	return r.Get(ctx, id, userID)
}

// Update replaces the editable fields.
func (r *Repository) Update(ctx context.Context, id int64, in Input, userID string) (Campaign, error) {
	now := r.now().UTC().Format(time.RFC3339Nano)
	var approachID interface{}
	if in.ApproachID != nil {
		approachID = *in.ApproachID
	}
	res, err := r.db.ExecContext(ctx,
		`UPDATE campaigns SET name=?, capital=?, goal=?, earned=?, status=?, start_date=?, end_date=?, approach_id=?, updated_at=?
		 WHERE id = ? AND user_id = ?`,
		in.Name, in.Capital, in.Goal, in.Earned, in.Status,
		in.StartDate, in.EndDate, approachID, now, id, userID)
	if err != nil {
		return Campaign{}, mapCampaignError(err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return Campaign{}, ErrNotFound
	}
	return r.Get(ctx, id, userID)
}

// Delete removes a campaign.
func (r *Repository) Delete(ctx context.Context, id int64, userID string) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM campaigns WHERE id = ? AND user_id = ?`, id, userID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

func mapCampaignError(err error) error {
	if strings.Contains(err.Error(), "UNIQUE constraint failed") {
		return ErrDuplicateName
	}
	return err
}

// SeedDemo inserts demo campaigns if the table is empty.
func (r *Repository) SeedDemo(ctx context.Context) error {
	var n int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM campaigns`).Scan(&n); err != nil || n > 0 {
		return err
	}
	demos := []Input{
		{Name: "Technology campaign 2026", Capital: 1000000, Goal: 1200000, Earned: 32179, Status: "on track", StartDate: "2026-01-01", EndDate: "2026-12-31"},
		{Name: "Banking sector", Capital: 150000, Goal: 200000, Earned: 9348, Status: "behind", StartDate: "2025-12-15", EndDate: "2026-03-15"},
		{Name: "Healthcare opportunity", Capital: 75000, Goal: 100000, Earned: 50130, Status: "completed", StartDate: "2025-10-10", EndDate: "2026-04-10"},
	}
	for _, d := range demos {
		if _, err := r.Create(ctx, d, "default"); err != nil {
			return err
		}
	}
	return nil
}


package approaches

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

var (
	ErrNotFound      = errors.New("approach not found")
	ErrDuplicateName = errors.New("an approach with this name already exists")
	ErrInUse         = errors.New("approach is used by campaigns")
)

// Repository stores approaches in SQLite (see internal/store for the schema).
type Repository struct {
	db  *sql.DB
	now func() time.Time
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, now: time.Now}
}

const selectColumns = `id, name, strategies, moneyness, holding_period, min_yield, risk,
	take_profit, stop_loss, max_position, dte_close_threshold, assignment_handling, auto_roll,
	used_in_campaigns, created_at, updated_at`

type scanner interface{ Scan(dest ...any) error }

func scanApproach(row scanner) (Approach, error) {
	var (
		a                    Approach
		strategies           string
		autoRoll             int
		createdAt, updatedAt string
	)
	err := row.Scan(&a.ID, &a.Name, &strategies, &a.Moneyness, &a.HoldingPeriod, &a.MinYield, &a.Risk,
		&a.TakeProfit, &a.StopLoss, &a.MaxPosition, &a.DTECloseThreshold, &a.AssignmentHandling, &autoRoll,
		&a.UsedInCampaigns, &createdAt, &updatedAt)
	if err != nil {
		return Approach{}, err
	}
	if err := json.Unmarshal([]byte(strategies), &a.Strategies); err != nil {
		return Approach{}, fmt.Errorf("approach %d: bad strategies column: %w", a.ID, err)
	}
	a.AutoRoll = autoRoll != 0
	a.CreatedAt, _ = time.Parse(time.RFC3339Nano, createdAt)
	a.UpdatedAt, _ = time.Parse(time.RFC3339Nano, updatedAt)
	return a, nil
}

// List returns all approaches, oldest first.
func (r *Repository) List(ctx context.Context) ([]Approach, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT `+selectColumns+` FROM approaches ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Approach{}
	for rows.Next() {
		a, err := scanApproach(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (r *Repository) Get(ctx context.Context, id int64) (Approach, error) {
	a, err := scanApproach(r.db.QueryRowContext(ctx, `SELECT `+selectColumns+` FROM approaches WHERE id = ?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return Approach{}, ErrNotFound
	}
	return a, err
}

// Create inserts a validated input and returns the stored approach.
func (r *Repository) Create(ctx context.Context, in Input) (Approach, error) {
	return r.create(ctx, in, 0)
}

func (r *Repository) create(ctx context.Context, in Input, usedIn int) (Approach, error) {
	strategies, err := json.Marshal(in.Strategies)
	if err != nil {
		return Approach{}, err
	}
	now := r.now().UTC().Format(time.RFC3339Nano)
	res, err := r.db.ExecContext(ctx, `INSERT INTO approaches
		(name, strategies, moneyness, holding_period, min_yield, risk, take_profit, stop_loss,
		 max_position, dte_close_threshold, assignment_handling, auto_roll, used_in_campaigns,
		 created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		in.Name, string(strategies), in.Moneyness, in.HoldingPeriod, in.MinYield, in.Risk,
		in.TakeProfit, in.StopLoss, in.MaxPosition, in.DTECloseThreshold, in.AssignmentHandling,
		boolInt(in.AutoRoll), usedIn, now, now)
	if err != nil {
		return Approach{}, mapWriteError(err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return Approach{}, err
	}
	return r.Get(ctx, id)
}

// Update replaces the editable fields of approach id.
func (r *Repository) Update(ctx context.Context, id int64, in Input) (Approach, error) {
	strategies, err := json.Marshal(in.Strategies)
	if err != nil {
		return Approach{}, err
	}
	res, err := r.db.ExecContext(ctx, `UPDATE approaches SET
		name = ?, strategies = ?, moneyness = ?, holding_period = ?, min_yield = ?, risk = ?,
		take_profit = ?, stop_loss = ?, max_position = ?, dte_close_threshold = ?,
		assignment_handling = ?, auto_roll = ?, updated_at = ?
		WHERE id = ?`,
		in.Name, string(strategies), in.Moneyness, in.HoldingPeriod, in.MinYield, in.Risk,
		in.TakeProfit, in.StopLoss, in.MaxPosition, in.DTECloseThreshold, in.AssignmentHandling,
		boolInt(in.AutoRoll), r.now().UTC().Format(time.RFC3339Nano), id)
	if err != nil {
		return Approach{}, mapWriteError(err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return Approach{}, ErrNotFound
	}
	return r.Get(ctx, id)
}

// Delete removes an approach unless campaigns still use it.
func (r *Repository) Delete(ctx context.Context, id int64) error {
	a, err := r.Get(ctx, id)
	if err != nil {
		return err
	}
	if a.UsedInCampaigns > 0 {
		return ErrInUse
	}
	_, err = r.db.ExecContext(ctx, `DELETE FROM approaches WHERE id = ?`, id)
	return err
}

func mapWriteError(err error) error {
	if strings.Contains(err.Error(), "UNIQUE constraint failed") {
		return ErrDuplicateName
	}
	return err
}

func boolInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

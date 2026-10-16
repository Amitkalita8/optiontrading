// Package tradelog provides an immutable append-only log of trade fills.
package tradelog

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

var ErrNotFound = errors.New("trade log entry not found")

// Entry is one record in the trade log.
type Entry struct {
	ID         int64     `json:"id"`
	PositionID *int64    `json:"positionId,omitempty"`
	Symbol     string    `json:"symbol"`
	Action     string    `json:"action"`
	Quantity   int       `json:"quantity"`
	Price      float64   `json:"price"`
	Notes      string    `json:"notes"`
	OccurredAt string    `json:"occurredAt"`
	CreatedAt  time.Time `json:"createdAt"`
}

// Input is the data required to append a new entry.
type Input struct {
	PositionID *int64  `json:"positionId"`
	Symbol     string  `json:"symbol"`
	Action     string  `json:"action"`
	Quantity   int     `json:"quantity"`
	Price      float64 `json:"price"`
	Notes      string  `json:"notes"`
	OccurredAt string  `json:"occurredAt"`
}

type Repository struct {
	db  *sql.DB
	now func() time.Time
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, now: time.Now}
}

func (r *Repository) List(ctx context.Context, userID string) ([]Entry, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, position_id, symbol, action, quantity, price, notes, occurred_at, created_at
		 FROM trade_log WHERE user_id = ? ORDER BY occurred_at DESC, id DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Entry
	for rows.Next() {
		e, err := scanEntry(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (r *Repository) Append(ctx context.Context, in Input, userID string) (Entry, error) {
	now := r.now().UTC().Format(time.RFC3339Nano)
	occurredAt := in.OccurredAt
	if occurredAt == "" {
		occurredAt = r.now().UTC().Format("2006-01-02")
	}
	action := in.Action
	if action == "" {
		action = "open"
	}
	qty := in.Quantity
	if qty == 0 {
		qty = 1
	}
	var posID interface{}
	if in.PositionID != nil {
		posID = *in.PositionID
	}
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO trade_log (user_id, position_id, symbol, action, quantity, price, notes, occurred_at, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		userID, posID, in.Symbol, action, qty, in.Price, in.Notes, occurredAt, now)
	if err != nil {
		return Entry{}, err
	}
	id, _ := res.LastInsertId()
	var e Entry
	err = r.db.QueryRowContext(ctx,
		`SELECT id, position_id, symbol, action, quantity, price, notes, occurred_at, created_at
		 FROM trade_log WHERE id = ?`, id).
		Scan(&e.ID, nilInt64Scan(&e.PositionID), &e.Symbol, &e.Action, &e.Quantity, &e.Price,
			&e.Notes, &e.OccurredAt, new(string))
	if err != nil {
		return Entry{}, err
	}
	// Re-scan properly
	return r.get(ctx, id)
}

func (r *Repository) get(ctx context.Context, id int64) (Entry, error) {
	return scanEntry(r.db.QueryRowContext(ctx,
		`SELECT id, position_id, symbol, action, quantity, price, notes, occurred_at, created_at
		 FROM trade_log WHERE id = ?`, id))
}

type rowScanner interface{ Scan(dest ...any) error }

func scanEntry(row rowScanner) (Entry, error) {
	var (
		e          Entry
		positionID sql.NullInt64
		createdAt  string
	)
	if err := row.Scan(&e.ID, &positionID, &e.Symbol, &e.Action, &e.Quantity,
		&e.Price, &e.Notes, &e.OccurredAt, &createdAt); errors.Is(err, sql.ErrNoRows) {
		return Entry{}, ErrNotFound
	} else if err != nil {
		return Entry{}, err
	}
	if positionID.Valid {
		e.PositionID = &positionID.Int64
	}
	e.CreatedAt, _ = time.Parse(time.RFC3339Nano, createdAt)
	return e, nil
}

func nilInt64Scan(dst **int64) *sql.NullInt64 {
	return &sql.NullInt64{}
}

// SeedDemo inserts demo trade log entries if the table is empty.
func (r *Repository) SeedDemo(ctx context.Context) error {
	var n int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM trade_log`).Scan(&n); err != nil || n > 0 {
		return err
	}
	demos := []Input{
		{Symbol: "AAPL", Action: "SELL_TO_OPEN", Quantity: 2, Price: 4.50, Notes: "Sold covered call at 0.20 delta", OccurredAt: "2026-10-01 10:15:00"},
		{Symbol: "MSFT", Action: "SELL_TO_OPEN", Quantity: 1, Price: 3.80, Notes: "Cash secured put post-earnings", OccurredAt: "2026-10-05 14:30:00"},
		{Symbol: "NVDA", Action: "SELL_TO_OPEN", Quantity: 3, Price: 2.06, Notes: "Iron condor 14 DTE setup", OccurredAt: "2026-10-10 11:00:00"},
		{Symbol: "GOOGL", Action: "BUY_TO_CLOSE", Quantity: 1, Price: 0.10, Notes: "Closed at 96% profit target", OccurredAt: "2026-10-12 15:45:00"},
	}
	for _, d := range demos {
		if _, err := r.Append(ctx, d, "default"); err != nil {
			return err
		}
	}
	return nil
}


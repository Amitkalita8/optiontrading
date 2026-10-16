// Package notifications manages in-app alerts.
package notifications

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

var ErrNotFound = errors.New("notification not found")

// Notification is a stored in-app alert.
type Notification struct {
	ID        int64     `json:"id"`
	Kind      string    `json:"kind"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	Read      bool      `json:"read"`
	CreatedAt time.Time `json:"createdAt"`
}

// Input is the data required to create a notification.
type Input struct {
	Kind  string `json:"kind"`
	Title string `json:"title"`
	Body  string `json:"body"`
}

type Repository struct {
	db  *sql.DB
	now func() time.Time
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, now: time.Now}
}

func (r *Repository) List(ctx context.Context, userID string) ([]Notification, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, kind, title, body, read, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC`,
		userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Notification
	for rows.Next() {
		n, err := scanNotification(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, rows.Err()
}

func (r *Repository) Create(ctx context.Context, in Input, userID string) (Notification, error) {
	kind := in.Kind
	if kind == "" {
		kind = "info"
	}
	now := r.now().UTC().Format(time.RFC3339Nano)
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO notifications (user_id, kind, title, body, read, created_at) VALUES (?, ?, ?, ?, 0, ?)`,
		userID, kind, in.Title, in.Body, now)
	if err != nil {
		return Notification{}, err
	}
	id, _ := res.LastInsertId()
	return r.get(ctx, id)
}

func (r *Repository) MarkRead(ctx context.Context, id int64, userID string) error {
	res, err := r.db.ExecContext(ctx,
		`UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?`, id, userID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) MarkAllRead(ctx context.Context, userID string) error {
	_, err := r.db.ExecContext(ctx, `UPDATE notifications SET read = 1 WHERE user_id = ?`, userID)
	return err
}

func (r *Repository) Delete(ctx context.Context, id int64, userID string) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM notifications WHERE id = ? AND user_id = ?`, id, userID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) get(ctx context.Context, id int64) (Notification, error) {
	return scanNotification(r.db.QueryRowContext(ctx,
		`SELECT id, kind, title, body, read, created_at FROM notifications WHERE id = ?`, id))
}

type rowScanner interface{ Scan(dest ...any) error }

func scanNotification(row rowScanner) (Notification, error) {
	var (
		n         Notification
		readInt   int
		createdAt string
	)
	if err := row.Scan(&n.ID, &n.Kind, &n.Title, &n.Body, &readInt, &createdAt); errors.Is(err, sql.ErrNoRows) {
		return Notification{}, ErrNotFound
	} else if err != nil {
		return Notification{}, err
	}
	n.Read = readInt != 0
	n.CreatedAt, _ = time.Parse(time.RFC3339Nano, createdAt)
	return n, nil
}

// SeedDemo inserts demo notifications if the table is empty.
func (r *Repository) SeedDemo(ctx context.Context) error {
	var n int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM notifications`).Scan(&n); err != nil || n > 0 {
		return err
	}
	demos := []Input{
		{Kind: "alert", Title: "NVDA Earnings Approaching", Body: "NVDA reports in 4 days. Consider rolling or closing the 125 strike condor."},
		{Kind: "success", Title: "Profit Target Reached", Body: "GOOGL covered call closed at 96% max profit target ($280 captured)."},
		{Kind: "info", Title: "Market Volatility Shift", Body: "Technology sector IV Rank increased by 8% today. New premium selling opportunities available."},
	}
	for _, d := range demos {
		if _, err := r.Create(ctx, d, "default"); err != nil {
			return err
		}
	}
	return nil
}


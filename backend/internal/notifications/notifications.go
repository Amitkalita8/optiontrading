// Package notifications manages in-app alerts.
package notifications

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

var ErrNotFound = errors.New("notification not found")

// Kinds pick the icon in the UI. Unknown kinds fall back to "info".
const (
	KindOrderRejected = "order-rejected"
	KindOrderFilled   = "order-filled"
	KindCampaign      = "campaign"
	KindBroker        = "broker"
	KindInfo          = "info"
)

type Notification struct {
	ID    int64  `json:"id"`
	Kind  string `json:"kind"`
	Title string `json:"title"`
	Body  string `json:"body"`
	// Source is the context line under the body, e.g. "Zerodha · •••• 4821".
	Source         string `json:"source"`
	ActionRequired bool   `json:"actionRequired"`
	// ActionLabel / ActionPath are the link on the right ("View order" → /trade-log).
	ActionLabel string    `json:"actionLabel"`
	ActionPath  string    `json:"actionPath"`
	Read        bool      `json:"read"`
	CreatedAt   time.Time `json:"createdAt"`
}

type Input struct {
	Kind           string `json:"kind"`
	Title          string `json:"title"`
	Body           string `json:"body"`
	Source         string `json:"source"`
	ActionRequired bool   `json:"actionRequired"`
	ActionLabel    string `json:"actionLabel"`
	ActionPath     string `json:"actionPath"`
}

type Repository struct {
	db  *sql.DB
	now func() time.Time
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, now: time.Now}
}

const columns = `id, kind, title, body, source, action_required, action_label, action_path, read, created_at`

// List returns the user's notifications, newest first.
func (r *Repository) List(ctx context.Context, userID string) ([]Notification, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT `+columns+` FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC`,
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
	return r.insert(ctx, in, userID, r.now())
}

func (r *Repository) insert(ctx context.Context, in Input, userID string, at time.Time) (Notification, error) {
	kind := in.Kind
	if kind == "" {
		kind = KindInfo
	}
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO notifications (user_id, kind, title, body, source, action_required, action_label, action_path, read, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
		userID, kind, in.Title, in.Body, in.Source, boolInt(in.ActionRequired), in.ActionLabel, in.ActionPath,
		at.UTC().Format(time.RFC3339Nano))
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
		`SELECT `+columns+` FROM notifications WHERE id = ?`, id))
}

type rowScanner interface{ Scan(dest ...any) error }

func scanNotification(row rowScanner) (Notification, error) {
	var (
		n               Notification
		readInt, actInt int
		createdAt       string
	)
	err := row.Scan(&n.ID, &n.Kind, &n.Title, &n.Body, &n.Source, &actInt, &n.ActionLabel, &n.ActionPath, &readInt, &createdAt)
	if errors.Is(err, sql.ErrNoRows) {
		return Notification{}, ErrNotFound
	} else if err != nil {
		return Notification{}, err
	}
	n.Read = readInt != 0
	n.ActionRequired = actInt != 0
	n.CreatedAt, _ = time.Parse(time.RFC3339Nano, createdAt)
	return n, nil
}

func boolInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

// SeedDemo inserts demo notifications if the table is empty: three from
// today and one from yesterday, all but "Order filled" unread.
func (r *Repository) SeedDemo(ctx context.Context) error {
	var n int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM notifications`).Scan(&n); err != nil || n > 0 {
		return err
	}
	now := r.now()
	demos := []struct {
		in   Input
		at   time.Time
		read bool
	}{
		{Input{
			Kind: KindBroker, Title: "Broker connection needs attention",
			Body:   "Reconnect your broker to restore the platform’s authorised access to account data.",
			Source: "Zerodha", ActionRequired: true,
			ActionLabel: "Review connection", ActionPath: "/settings/broker-accounts",
		}, now.Add(-24 * time.Hour), false},
		{Input{
			Kind: KindOrderFilled, Title: "Order filled",
			Body:   "Your options order was filled. View the final execution details.",
			Source: "Upstox · •••• 9067", ActionLabel: "View order", ActionPath: "/trade-log",
		}, now.Add(-2 * time.Minute), true},
		{Input{
			Kind: KindCampaign, Title: "Campaign paused",
			Body:   "Your Technology campaign needs attention before it can resume.",
			Source: "Technology campaign 2026", ActionRequired: true,
			ActionLabel: "Review Campaign", ActionPath: "/campaigns",
		}, now.Add(-time.Minute), false},
		{Input{
			Kind: KindOrderRejected, Title: "Order rejected",
			Body:   "Your NIFTY options order was rejected by the broker. Review the rejection reason before trying again.",
			Source: "Zerodha · •••• 4821", ActionRequired: true,
			ActionLabel: "View order", ActionPath: "/trade-log",
		}, now, false},
	}
	for _, d := range demos {
		created, err := r.insert(ctx, d.in, "default", d.at)
		if err != nil {
			return err
		}
		if d.read {
			if err := r.MarkRead(ctx, created.ID, "default"); err != nil {
				return err
			}
		}
	}
	return nil
}

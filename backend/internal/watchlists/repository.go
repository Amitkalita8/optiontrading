package watchlists

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

// Repository stores watchlists in SQLite.
type Repository struct {
	db  *sql.DB
	now func() time.Time
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, now: time.Now}
}

// List returns all watchlists for the user, newest first.
func (r *Repository) List(ctx context.Context, userID string) ([]Watchlist, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, name, created_at, updated_at FROM watchlists WHERE user_id = ? ORDER BY id`,
		userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Watchlist
	for rows.Next() {
		w, err := scanWatchlist(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, w)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	// Load tickers for each watchlist.
	for i := range out {
		if out[i].Tickers, err = r.tickers(ctx, out[i].ID); err != nil {
			return nil, err
		}
	}
	return out, nil
}

// Get returns a single watchlist with its tickers.
func (r *Repository) Get(ctx context.Context, id int64, userID string) (Watchlist, error) {
	w, err := scanWatchlist(r.db.QueryRowContext(ctx,
		`SELECT id, name, created_at, updated_at FROM watchlists WHERE id = ? AND user_id = ?`, id, userID))
	if errors.Is(err, sql.ErrNoRows) {
		return Watchlist{}, ErrNotFound
	}
	if err != nil {
		return Watchlist{}, err
	}
	w.Tickers, err = r.tickers(ctx, id)
	return w, err
}

// Create inserts a new watchlist and returns it.
func (r *Repository) Create(ctx context.Context, in Input, userID string) (Watchlist, error) {
	now := r.now().UTC().Format(time.RFC3339Nano)
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO watchlists (user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)`,
		userID, in.Name, now, now)
	if err != nil {
		return Watchlist{}, mapWatchlistError(err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return Watchlist{}, err
	}
	if err := r.setTickers(ctx, id, in.Tickers); err != nil {
		return Watchlist{}, err
	}
	return r.Get(ctx, id, userID)
}

// Rename changes the watchlist name.
func (r *Repository) Rename(ctx context.Context, id int64, name string, userID string) (Watchlist, error) {
	now := r.now().UTC().Format(time.RFC3339Nano)
	res, err := r.db.ExecContext(ctx,
		`UPDATE watchlists SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
		name, now, id, userID)
	if err != nil {
		return Watchlist{}, mapWatchlistError(err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return Watchlist{}, ErrNotFound
	}
	return r.Get(ctx, id, userID)
}

// SetTickers replaces the full ticker list for a watchlist.
func (r *Repository) SetTickers(ctx context.Context, id int64, tickers []string, userID string) (Watchlist, error) {
	// Verify ownership.
	if _, err := r.Get(ctx, id, userID); err != nil {
		return Watchlist{}, err
	}
	now := r.now().UTC().Format(time.RFC3339Nano)
	if _, err := r.db.ExecContext(ctx, `UPDATE watchlists SET updated_at = ? WHERE id = ?`, now, id); err != nil {
		return Watchlist{}, err
	}
	if err := r.setTickers(ctx, id, tickers); err != nil {
		return Watchlist{}, err
	}
	return r.Get(ctx, id, userID)
}

// Delete removes a watchlist (cascade deletes items).
func (r *Repository) Delete(ctx context.Context, id int64, userID string) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM watchlists WHERE id = ? AND user_id = ?`, id, userID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

// tickers returns the ordered ticker list for a watchlist.
func (r *Repository) tickers(ctx context.Context, watchlistID int64) ([]string, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT ticker FROM watchlist_items WHERE watchlist_id = ? ORDER BY position, ticker`,
		watchlistID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var t string
		if err := rows.Scan(&t); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

// setTickers replaces all items for a watchlist in a single transaction.
func (r *Repository) setTickers(ctx context.Context, watchlistID int64, tickers []string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM watchlist_items WHERE watchlist_id = ?`, watchlistID); err != nil {
		tx.Rollback()
		return err
	}
	for i, t := range tickers {
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO watchlist_items (watchlist_id, ticker, position) VALUES (?, ?, ?)`,
			watchlistID, t, i); err != nil {
			tx.Rollback()
			return err
		}
	}
	return tx.Commit()
}

type wlScanner interface{ Scan(dest ...any) error }

func scanWatchlist(row wlScanner) (Watchlist, error) {
	var w Watchlist
	var createdAt, updatedAt string
	if err := row.Scan(&w.ID, &w.Name, &createdAt, &updatedAt); err != nil {
		return Watchlist{}, err
	}
	w.CreatedAt, _ = time.Parse(time.RFC3339Nano, createdAt)
	w.UpdatedAt, _ = time.Parse(time.RFC3339Nano, updatedAt)
	w.Tickers = []string{}
	return w, nil
}

func mapWatchlistError(err error) error {
	if strings.Contains(err.Error(), "UNIQUE constraint failed") {
		return ErrDuplicateName
	}
	return fmt.Errorf("watchlist: %w", err)
}

// SeedDemo inserts demo watchlists if the table is empty.
func (r *Repository) SeedDemo(ctx context.Context) error {
	var n int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM watchlists`).Scan(&n); err != nil || n > 0 {
		return err
	}
	demos := []Input{
		{Name: "Technology campaign 2026", Tickers: []string{"MSFT", "NVDA", "META", "AMZN", "AAPL", "GOOGL", "TSLA", "AVGO"}},
		{Name: "Banking sector", Tickers: []string{"BAC", "WFC", "C", "JPM", "MS", "GS", "USB", "PNC"}},
		{Name: "Healthcare Opportunities", Tickers: []string{"UNH", "JNJ", "LLY", "PFE", "ABBV", "MRK", "CVS", "AMGN", "TMO", "ABT"}},
		{Name: "Core opportunities", Tickers: []string{"MSFT", "NVDA", "AAPL", "AMZN", "GOOGL", "META", "TSLA", "AMD", "PLTR", "JPM", "CRM", "NFLX"}},
		{Name: "New watchlist - testing", Tickers: []string{"MSFT", "NVDA", "AAPL", "AMZN", "GOOGL", "META"}},
	}
	for _, d := range demos {
		if _, err := r.Create(ctx, d, "default"); err != nil {
			return err
		}
	}
	return nil
}


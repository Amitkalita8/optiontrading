// Package store opens the SQLite database and applies schema migrations.
//
// It uses modernc.org/sqlite, a pure-Go driver, so no C toolchain (cgo) is
// needed to build or run the server.
package store

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

// migrations are applied in order; the database's PRAGMA user_version records
// how many have run. Only ever append — never edit an applied migration.
var migrations = []string{
	// 1: trade approaches
	`CREATE TABLE approaches (
		id                  INTEGER PRIMARY KEY AUTOINCREMENT,
		name                TEXT    NOT NULL UNIQUE COLLATE NOCASE,
		strategies          TEXT    NOT NULL,             -- JSON array of strategy names
		moneyness           TEXT    NOT NULL,             -- ITM | ATM | OTM
		holding_period      TEXT    NOT NULL,             -- 7-14d | 15-30d | 30-45d | 60d+
		min_yield           REAL    NOT NULL,             -- % annualised
		risk                TEXT    NOT NULL,             -- lower | moderate | aggressive
		take_profit         REAL    NOT NULL,             -- % of max profit
		stop_loss           REAL    NOT NULL,             -- % loss
		max_position        REAL    NOT NULL,             -- % of capital per underlying
		dte_close_threshold INTEGER NOT NULL DEFAULT 0,   -- close at N days to expiry, 0 = off
		assignment_handling TEXT    NOT NULL DEFAULT 'roll',
		auto_roll           INTEGER NOT NULL DEFAULT 0,
		used_in_campaigns   INTEGER NOT NULL DEFAULT 0,
		created_at          TEXT    NOT NULL,
		updated_at          TEXT    NOT NULL
	)`,

	// 2: watchlists — user-defined collections of tickers
	`CREATE TABLE watchlists (
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id    TEXT    NOT NULL DEFAULT 'default',
		name       TEXT    NOT NULL COLLATE NOCASE,
		created_at TEXT    NOT NULL,
		updated_at TEXT    NOT NULL,
		UNIQUE(user_id, name)
	);
	CREATE TABLE watchlist_items (
		watchlist_id INTEGER NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
		ticker       TEXT    NOT NULL,
		position     INTEGER NOT NULL DEFAULT 0,
		PRIMARY KEY (watchlist_id, ticker)
	)`,

	// 3: campaigns — structured trading programs with a capital goal
	`CREATE TABLE campaigns (
		id          INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id     TEXT    NOT NULL DEFAULT 'default',
		name        TEXT    NOT NULL COLLATE NOCASE,
		capital     REAL    NOT NULL DEFAULT 0,
		goal        REAL    NOT NULL DEFAULT 0,
		earned      REAL    NOT NULL DEFAULT 0,
		status      TEXT    NOT NULL DEFAULT 'active',    -- active | paused | completed
		start_date  TEXT    NOT NULL,
		end_date    TEXT    NOT NULL,
		approach_id INTEGER REFERENCES approaches(id) ON DELETE SET NULL,
		created_at  TEXT    NOT NULL,
		updated_at  TEXT    NOT NULL
	)`,

	// 4: positions — open option positions
	`CREATE TABLE positions (
		id              INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id         TEXT    NOT NULL DEFAULT 'default',
		campaign_id     INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
		symbol          TEXT    NOT NULL,
		strategy        TEXT    NOT NULL,
		quantity        INTEGER NOT NULL DEFAULT 1,
		strike          REAL    NOT NULL,
		expiry          TEXT    NOT NULL,           -- YYYY-MM-DD
		premium_credit  REAL    NOT NULL DEFAULT 0, -- credit received per contract × 100
		current_value   REAL    NOT NULL DEFAULT 0, -- current mark × 100
		status          TEXT    NOT NULL DEFAULT 'open', -- open | closed
		opened_at       TEXT    NOT NULL,
		closed_at       TEXT,
		created_at      TEXT    NOT NULL,
		updated_at      TEXT    NOT NULL
	)`,

	// 5: trade_log — immutable record of every fill / close
	`CREATE TABLE trade_log (
		id          INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id     TEXT    NOT NULL DEFAULT 'default',
		position_id INTEGER REFERENCES positions(id) ON DELETE SET NULL,
		symbol      TEXT    NOT NULL,
		action      TEXT    NOT NULL,              -- open | close | roll | expired | assigned
		quantity    INTEGER NOT NULL DEFAULT 1,
		price       REAL    NOT NULL,
		notes       TEXT    NOT NULL DEFAULT '',
		occurred_at TEXT    NOT NULL,
		created_at  TEXT    NOT NULL
	)`,

	// 6: notifications — in-app alerts
	`CREATE TABLE notifications (
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id    TEXT    NOT NULL DEFAULT 'default',
		kind       TEXT    NOT NULL DEFAULT 'info', -- info | warning | alert
		title      TEXT    NOT NULL,
		body       TEXT    NOT NULL DEFAULT '',
		read       INTEGER NOT NULL DEFAULT 0,
		created_at TEXT    NOT NULL
	)`,

	// 7: users — registered user accounts
	`CREATE TABLE users (
		id            INTEGER PRIMARY KEY AUTOINCREMENT,
		name          TEXT    NOT NULL,
		email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
		password_hash TEXT    NOT NULL DEFAULT '',
		provider      TEXT    NOT NULL DEFAULT 'email', -- email | google
		avatar_url    TEXT    NOT NULL DEFAULT '',
		created_at    TEXT    NOT NULL,
		updated_at    TEXT    NOT NULL
	)`,
}

// Open opens (creating if needed) the database at path and migrates it.
func Open(path string) (*sql.DB, error) {
	if dir := filepath.Dir(path); dir != "." {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return nil, fmt.Errorf("store: create %s: %w", dir, err)
		}
	}
	// WAL lets readers proceed during writes; busy_timeout waits briefly on locks.
	dsn := "file:" + filepath.ToSlash(path) + "?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=foreign_keys(1)"
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("store: open %s: %w", path, err)
	}
	// WAL mode allows concurrent readers; 5 connections give read parallelism
	// while writes still serialize naturally via SQLite's single-writer model.
	db.SetMaxOpenConns(5)
	if err := migrate(db); err != nil {
		db.Close()
		return nil, err
	}
	return db, nil
}

func migrate(db *sql.DB) error {
	var version int
	if err := db.QueryRow(`PRAGMA user_version`).Scan(&version); err != nil {
		return fmt.Errorf("store: read schema version: %w", err)
	}
	for i := version; i < len(migrations); i++ {
		tx, err := db.Begin()
		if err != nil {
			return err
		}
		if _, err := tx.Exec(migrations[i]); err != nil {
			tx.Rollback()
			return fmt.Errorf("store: migration %d: %w", i+1, err)
		}
		// PRAGMA can't take a bound parameter; i+1 is our own integer.
		if _, err := tx.Exec(fmt.Sprintf(`PRAGMA user_version = %d`, i+1)); err != nil {
			tx.Rollback()
			return fmt.Errorf("store: set schema version: %w", err)
		}
		if err := tx.Commit(); err != nil {
			return err
		}
	}
	return nil
}

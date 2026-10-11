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
	// SQLite allows one writer at a time; a single connection avoids lock contention.
	db.SetMaxOpenConns(1)
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

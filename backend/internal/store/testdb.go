package store

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"net/url"
	"os"
	"path/filepath"
	"testing"
)

// OpenTest opens a fresh, migrated database for one test.
//
// By default that is a SQLite file in a temp dir. With TEST_DATABASE_URL set
// (a Postgres URL) each test gets its own schema in that database, dropped
// when the test ends, so the suite can verify Postgres without touching data:
//
//	TEST_DATABASE_URL=postgres://postgres:pw@localhost:5432/optiontrading?sslmode=disable go test ./...
func OpenTest(tb testing.TB) *sql.DB {
	tb.Helper()
	base := os.Getenv("TEST_DATABASE_URL")
	if base == "" {
		db, err := Open(filepath.Join(tb.TempDir(), "test.db"))
		if err != nil {
			tb.Fatal(err)
		}
		tb.Cleanup(func() { db.Close() })
		return db
	}

	buf := make([]byte, 6)
	_, _ = rand.Read(buf)
	schema := "test_" + hex.EncodeToString(buf)

	admin, err := OpenPostgresNoMigrate(base)
	if err != nil {
		tb.Fatal(err)
	}
	// citext must live in public so every test schema can see it.
	for _, q := range []string{`CREATE EXTENSION IF NOT EXISTS citext SCHEMA public`, `CREATE SCHEMA ` + schema} {
		// Parallel test packages may create the extension at the same moment.
		if _, err := admin.Exec(q); err != nil && !IsUniqueViolation(err) {
			admin.Close()
			tb.Fatal(err)
		}
	}
	u, err := url.Parse(base)
	if err != nil {
		admin.Close()
		tb.Fatal(err)
	}
	q := u.Query()
	q.Set("search_path", schema+",public")
	u.RawQuery = q.Encode()
	db, err := OpenPostgres(u.String())
	if err != nil {
		admin.Close()
		tb.Fatal(err)
	}
	tb.Cleanup(func() {
		db.Close()
		_, _ = admin.Exec(`DROP SCHEMA ` + schema + ` CASCADE`)
		admin.Close()
	})
	return db
}

// OpenPostgresNoMigrate connects without touching the schema.
func OpenPostgresNoMigrate(url string) (*sql.DB, error) {
	registerOnce.Do(register)
	db, err := sql.Open(pgDriverName, url)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, err
	}
	return db, nil
}

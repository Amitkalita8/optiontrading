// Command sqlite2pg copies every table from the SQLite database into
// PostgreSQL, once, when switching the app to Postgres.
//
//	cd backend
//	go run ./cmd/sqlite2pg                 # DATABASE_URL and DB_PATH from .env / environment
//	go run ./cmd/sqlite2pg -force          # replace data already in Postgres
//
// The SQLite file is only read. Everything is copied in one transaction, so a
// failure leaves Postgres unchanged.
package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	"optiontrading/backend/internal/config"
	"optiontrading/backend/internal/store"
)

func main() {
	if err := config.LoadDotEnv(".env"); err != nil {
		log.Fatalf("read .env: %v", err)
	}
	cfg := config.Load()
	sqlitePath := flag.String("sqlite", cfg.DBPath, "SQLite database file to copy from")
	pgURL := flag.String("pg", cfg.DatabaseURL, "PostgreSQL URL to copy into (default: DATABASE_URL)")
	force := flag.Bool("force", false, "empty the Postgres tables first if they already contain data")
	flag.Parse()

	if *pgURL == "" {
		log.Fatal("no Postgres URL: set DATABASE_URL in backend/.env or pass -pg")
	}
	if _, err := os.Stat(*sqlitePath); err != nil {
		log.Fatalf("SQLite file %s: %v", *sqlitePath, err)
	}
	src, err := store.Open(*sqlitePath)
	if err != nil {
		log.Fatalf("open SQLite: %v", err)
	}
	defer src.Close()
	dst, err := store.OpenPostgres(*pgURL)
	if err != nil {
		log.Fatalf("open Postgres: %v", err)
	}
	defer dst.Close()

	ctx := context.Background()
	if err := run(ctx, src, dst, *force); err != nil {
		log.Fatalf("copy failed, Postgres unchanged: %v", err)
	}
}

func run(ctx context.Context, src, dst *sql.DB, force bool) error {
	existing := 0
	for _, t := range store.Tables {
		var n int
		if err := dst.QueryRowContext(ctx, fmt.Sprintf(`SELECT COUNT(*) FROM "%s"`, t)).Scan(&n); err != nil {
			return err
		}
		existing += n
	}
	if existing > 0 && !force {
		return fmt.Errorf("Postgres already has %d rows; re-run with -force to replace them", existing)
	}

	tx, err := dst.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if existing > 0 {
		quoted := make([]string, len(store.Tables))
		for i, t := range store.Tables {
			quoted[i] = `"` + t + `"`
		}
		if _, err := tx.ExecContext(ctx, `TRUNCATE `+strings.Join(quoted, ", ")+` RESTART IDENTITY CASCADE`); err != nil {
			return err
		}
	}

	counts := map[string]int{}
	for _, t := range store.Tables {
		n, err := copyTable(ctx, src, tx, t)
		if err != nil {
			return fmt.Errorf("%s: %w", t, err)
		}
		counts[t] = n
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	if err := store.ResetSequences(ctx, dst); err != nil {
		return err
	}

	// Verify.
	fmt.Printf("%-18s %8s %8s\n", "table", "sqlite", "postgres")
	ok := true
	for _, t := range store.Tables {
		var n int
		_ = dst.QueryRowContext(ctx, fmt.Sprintf(`SELECT COUNT(*) FROM "%s"`, t)).Scan(&n)
		mark := ""
		if n != counts[t] {
			mark, ok = "  MISMATCH", false
		}
		fmt.Printf("%-18s %8d %8d%s\n", t, counts[t], n, mark)
	}
	if !ok {
		return fmt.Errorf("row counts differ")
	}
	fmt.Println("Done: all rows copied. Start the backend with DATABASE_URL set to use PostgreSQL.")
	return nil
}

type column struct{ name, pgType string }

// copyTable copies the columns both databases share.
func copyTable(ctx context.Context, src *sql.DB, tx *sql.Tx, table string) (int, error) {
	rows, err := tx.QueryContext(ctx, `SELECT column_name::text, data_type::text FROM information_schema.columns
		WHERE table_schema = current_schema() AND table_name = ? ORDER BY ordinal_position`, table)
	if err != nil {
		return 0, err
	}
	var pgCols []column
	for rows.Next() {
		var c column
		if err := rows.Scan(&c.name, &c.pgType); err != nil {
			rows.Close()
			return 0, err
		}
		pgCols = append(pgCols, c)
	}
	rows.Close()

	srcCols := map[string]bool{}
	info, err := src.QueryContext(ctx, fmt.Sprintf(`PRAGMA table_info("%s")`, table))
	if err != nil {
		return 0, err
	}
	for info.Next() {
		var (
			cid, notNull, pk int
			name, typ        string
			dflt             sql.NullString
		)
		if err := info.Scan(&cid, &name, &typ, &notNull, &dflt, &pk); err != nil {
			info.Close()
			return 0, err
		}
		srcCols[name] = true
	}
	info.Close()

	var cols []column
	var names, marks []string
	for _, c := range pgCols {
		if srcCols[c.name] {
			cols = append(cols, c)
			names = append(names, `"`+c.name+`"`)
			marks = append(marks, "?")
		}
	}
	if len(cols) == 0 {
		return 0, nil
	}
	data, err := src.QueryContext(ctx, fmt.Sprintf(`SELECT %s FROM "%s"`, strings.Join(names, ", "), table))
	if err != nil {
		return 0, err
	}
	defer data.Close()
	insert := fmt.Sprintf(`INSERT INTO "%s" (%s) VALUES (%s)`, table, strings.Join(names, ", "), strings.Join(marks, ", "))
	n := 0
	for data.Next() {
		vals := make([]any, len(cols))
		ptrs := make([]any, len(cols))
		for i := range vals {
			ptrs[i] = &vals[i]
		}
		if err := data.Scan(ptrs...); err != nil {
			return n, err
		}
		for i, c := range cols {
			vals[i] = convert(vals[i], c.pgType)
		}
		if _, err := tx.ExecContext(ctx, insert, vals...); err != nil {
			return n, fmt.Errorf("row %d: %w", n+1, err)
		}
		n++
	}
	return n, data.Err()
}

// convert adapts SQLite's loose types to the Postgres column type.
func convert(v any, pgType string) any {
	switch x := v.(type) {
	case []byte:
		return string(x)
	case int64:
		if pgType == "double precision" {
			return float64(x)
		}
		if pgType == "text" || pgType == "USER-DEFINED" {
			return fmt.Sprint(x)
		}
	case float64:
		if pgType == "integer" || pgType == "bigint" {
			return int64(x)
		}
		if pgType == "text" || pgType == "USER-DEFINED" {
			return fmt.Sprint(x)
		}
	}
	return v
}

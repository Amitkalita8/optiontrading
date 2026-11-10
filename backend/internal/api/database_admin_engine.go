package api

import (
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"optiontrading/backend/internal/store"
)

// Labels for the database viewer that work for SQLite and PostgreSQL.

func (a *API) dbEngine() string {
	if a.db == nil {
		return "Database"
	}
	return store.EngineName(a.db)
}

// dbName is the Postgres database name or the SQLite file name.
func (a *API) dbName() string {
	if a.db != nil && store.IsPostgres(a.db) {
		var name string
		if err := a.db.QueryRow(`SELECT current_database()`).Scan(&name); err == nil {
			return name
		}
		return "postgres"
	}
	return filepath.Base(a.cfg.DBPath)
}

// dbSize is the database size, human readable.
func (a *API) dbSize() string {
	if a.db != nil && store.IsPostgres(a.db) {
		var size string
		if err := a.db.QueryRow(`SELECT pg_size_pretty(pg_database_size(current_database()))`).Scan(&size); err == nil {
			return size
		}
		return "Unknown"
	}
	if fi, err := os.Stat(a.cfg.DBPath); err == nil {
		return fmt.Sprintf("%.2f KB", float64(fi.Size())/1024.0)
	}
	return "Unknown"
}

// dbLocation is the SQLite path or the Postgres host/database, never the password.
func (a *API) dbLocation() string {
	if a.db != nil && store.IsPostgres(a.db) {
		u, err := url.Parse(a.cfg.DatabaseURL)
		if err != nil || u.Host == "" {
			return "PostgreSQL"
		}
		user := ""
		if u.User != nil {
			user = u.User.Username() + "@"
		}
		return "postgres://" + user + u.Host + "/" + strings.TrimPrefix(u.Path, "/")
	}
	return a.cfg.DBPath
}

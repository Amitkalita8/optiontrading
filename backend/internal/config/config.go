// Package config reads server settings from environment variables.
package config

import (
	"os"
	"strings"
	"time"
)

type Config struct {
	// Addr is the listen address, e.g. ":8085" (env PORT).
	Addr string
	// AllowedOrigins may call the API from a browser (env ALLOWED_ORIGINS, comma separated).
	AllowedOrigins []string
	// QuoteCacheTTL is how long an upstream quote is reused before refetching.
	QuoteCacheTTL time.Duration
	// StreamIntervalOpen / StreamIntervalClosed set how often /stream pushes
	// quotes while the market is open / closed.
	StreamIntervalOpen   time.Duration
	StreamIntervalClosed time.Duration
	// DBPath is the SQLite database file (env DB_PATH), used when DatabaseURL is empty.
	DBPath string
	// DatabaseURL selects PostgreSQL (env DATABASE_URL), e.g.
	// postgres://postgres:secret@localhost:5432/optiontrading?sslmode=disable
	DatabaseURL string
	// SeedDemoData inserts example approaches into an empty database (env SEED_DEMO_DATA=false to disable).
	SeedDemoData bool
	// GroqAPIKey enables the AI stock screener (env GROQ_API_KEY; keep it in backend/.env).
	GroqAPIKey string
	// GroqModel is the chat model the screener asks (env GROQ_MODEL).
	GroqModel string
	// SMTP sends password-reset codes (SMTP_HOST, SMTP_PORT, SMTP_USER,
	// SMTP_PASS, SMTP_FROM). Without SMTP_HOST, codes are written to the log.
	SMTPHost, SMTPPort, SMTPUser, SMTPPass, SMTPFrom string
	// APIToken protects the API endpoints when non-empty (env API_TOKEN).
	APIToken string
	// SessionSecret signs sign-in tokens (env SESSION_SECRET). When empty a
	// random secret is used, so everyone is signed out when the server restarts.
	SessionSecret string
	// GoogleClientID is the OAuth client the frontend uses (env GOOGLE_CLIENT_ID);
	// Google tokens issued to any other client are rejected.
	GoogleClientID string
	// SeedDemoUsers adds the demo accounts (known passwords) to an empty users
	// table (env SEED_DEMO_USERS=false to disable; always off in production).
	SeedDemoUsers bool
	// DBAdminPassword is the /phpmyadmin password (env DB_ADMIN_PASSWORD). When
	// empty, the viewer uses the local default, or is disabled in production.
	DBAdminPassword string
	// Production is true on Render (env RENDER) or with APP_ENV=production.
	Production bool
}

func Load() Config {
	production := env("RENDER", "") != "" || env("APP_ENV", "") == "production"
	return Config{
		Addr:                 ":" + env("PORT", "8085"),
		AllowedOrigins:       splitList(env("ALLOWED_ORIGINS", "http://localhost:3000")),
		QuoteCacheTTL:        duration("QUOTE_CACHE_TTL", 4*time.Second),
		StreamIntervalOpen:   duration("STREAM_INTERVAL_OPEN", 5*time.Second),
		StreamIntervalClosed: duration("STREAM_INTERVAL_CLOSED", 60*time.Second),
		DBPath:               env("DB_PATH", "data/optiontrading.db"),
		DatabaseURL:          env("DATABASE_URL", ""),
		SeedDemoData:         env("SEED_DEMO_DATA", "true") != "false",
		GroqAPIKey:           env("GROQ_API_KEY", ""),
		GroqModel:            env("GROQ_MODEL", "openai/gpt-oss-120b"),
		SMTPHost:             env("SMTP_HOST", ""),
		SMTPPort:             env("SMTP_PORT", "587"),
		SMTPUser:             env("SMTP_USER", ""),
		SMTPPass:             env("SMTP_PASS", ""),
		SMTPFrom:             env("SMTP_FROM", ""),
		APIToken:             env("API_TOKEN", ""),
		SessionSecret:        env("SESSION_SECRET", ""),
		GoogleClientID:       env("GOOGLE_CLIENT_ID", ""),
		DBAdminPassword:      env("DB_ADMIN_PASSWORD", ""),
		Production:           production,
		SeedDemoUsers:        env("SEED_DEMO_USERS", "true") != "false" && !production,
	}
}

func env(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func duration(key string, fallback time.Duration) time.Duration {
	if d, err := time.ParseDuration(os.Getenv(key)); err == nil && d > 0 {
		return d
	}
	return fallback
}

func splitList(s string) []string {
	var out []string
	for _, part := range strings.Split(s, ",") {
		if p := strings.TrimSpace(part); p != "" {
			out = append(out, p)
		}
	}
	return out
}

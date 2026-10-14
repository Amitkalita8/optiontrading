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
	// DBPath is the SQLite database file (env DB_PATH).
	DBPath string
	// SeedDemoData inserts example approaches into an empty database (env SEED_DEMO_DATA=false to disable).
	SeedDemoData bool
	// GroqAPIKey enables the AI stock screener (env GROQ_API_KEY; keep it in backend/.env).
	GroqAPIKey string
	// GroqModel is the chat model the screener asks (env GROQ_MODEL).
	GroqModel string
}

func Load() Config {
	return Config{
		Addr:                 ":" + env("PORT", "8085"),
		AllowedOrigins:       splitList(env("ALLOWED_ORIGINS", "http://localhost:3000")),
		QuoteCacheTTL:        duration("QUOTE_CACHE_TTL", 4*time.Second),
		StreamIntervalOpen:   duration("STREAM_INTERVAL_OPEN", 5*time.Second),
		StreamIntervalClosed: duration("STREAM_INTERVAL_CLOSED", 60*time.Second),
		DBPath:               env("DB_PATH", "data/optiontrading.db"),
		SeedDemoData:         env("SEED_DEMO_DATA", "true") != "false",
		GroqAPIKey:           env("GROQ_API_KEY", ""),
		GroqModel:            env("GROQ_MODEL", "openai/gpt-oss-120b"),
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

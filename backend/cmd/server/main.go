// Command server runs the option-trading backend API.
package main

import (
	"context"
	"errors"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	// Embed the time zone database so America/New_York resolves on any OS.
	_ "time/tzdata"

	"optiontrading/backend/internal/api"
	"optiontrading/backend/internal/approaches"
	"optiontrading/backend/internal/campaigns"
	"optiontrading/backend/internal/config"
	"optiontrading/backend/internal/insights"
	"optiontrading/backend/internal/notifications"
	"optiontrading/backend/internal/positions"
	"optiontrading/backend/internal/quotes"
	"optiontrading/backend/internal/store"
	"optiontrading/backend/internal/tradelog"
	"optiontrading/backend/internal/users"
	"optiontrading/backend/internal/watchlists"
)

func main() {
	if err := config.LoadDotEnv(".env"); err != nil {
		log.Fatalf("read .env: %v", err)
	}
	cfg := config.Load()
	quoteService := quotes.NewService(quotes.NewClient(), cfg.QuoteCacheTTL)

	var llm insights.Completer // nil disables the AI screener
	if cfg.GroqAPIKey != "" {
		llm = insights.NewGroqClient(cfg.GroqAPIKey, cfg.GroqModel)
	} else {
		log.Print("GROQ_API_KEY not set: AI screener disabled")
	}
	insightService := insights.NewService(quoteService, llm, cfg.GroqModel)

	db, err := store.Open(cfg.DBPath)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer db.Close()
	approachRepo := approaches.NewRepository(db)
	watchlistRepo := watchlists.NewRepository(db)
	campaignRepo := campaigns.NewRepository(db)
	positionRepo := positions.NewRepository(db)
	tradeLogRepo := tradelog.NewRepository(db)
	notificationRepo := notifications.NewRepository(db)
	userRepo := users.NewRepository(db)

	if cfg.SeedDemoData {
		ctx := context.Background()
		if err := approachRepo.SeedDemo(ctx); err != nil {
			log.Fatalf("seed demo approaches: %v", err)
		}
		if err := watchlistRepo.SeedDemo(ctx); err != nil {
			log.Fatalf("seed demo watchlists: %v", err)
		}
		if err := campaignRepo.SeedDemo(ctx); err != nil {
			log.Fatalf("seed demo campaigns: %v", err)
		}
		if err := positionRepo.SeedDemo(ctx); err != nil {
			log.Fatalf("seed demo positions: %v", err)
		}
		if err := tradeLogRepo.SeedDemo(ctx); err != nil {
			log.Fatalf("seed demo trade log: %v", err)
		}
		if err := notificationRepo.SeedDemo(ctx); err != nil {
			log.Fatalf("seed demo notifications: %v", err)
		}
		if err := userRepo.SeedDemo(ctx); err != nil {
			log.Fatalf("seed demo users: %v", err)
		}
	}

	// Cancelled on shutdown so long-lived streams end instead of blocking it.
	baseCtx, cancelBase := context.WithCancel(context.Background())
	defer cancelBase()

	srv := &http.Server{
		Addr: cfg.Addr,
		Handler: api.New(
			cfg,
			db,
			quoteService,
			approachRepo,
			insightService,
			watchlistRepo,
			campaignRepo,
			positionRepo,
			tradeLogRepo,
			notificationRepo,
			userRepo,
		).Routes(),
		ReadHeaderTimeout: 10 * time.Second,
		WriteTimeout:      30 * time.Second, // the stream handler lifts this for itself
		IdleTimeout:       90 * time.Second,
		BaseContext:       func(net.Listener) context.Context { return baseCtx },
	}

	stop, unregister := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer unregister()

	// Bind first so a busy port fails loudly before we claim to be listening.
	ln, err := net.Listen("tcp", cfg.Addr)
	if err != nil {
		log.Fatalf("listen on %s: %v (set PORT to use another port)", cfg.Addr, err)
	}
	go func() {
		log.Printf("backend listening on %s (allowed origins: %v)", cfg.Addr, cfg.AllowedOrigins)
		if err := srv.Serve(ln); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("serve: %v", err)
		}
	}()

	<-stop.Done()
	log.Print("shutting down…")
	cancelBase()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("shutdown: %v", err)
	}
}

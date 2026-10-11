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
	"optiontrading/backend/internal/config"
	"optiontrading/backend/internal/quotes"
	"optiontrading/backend/internal/store"
)

func main() {
	cfg := config.Load()
	quoteService := quotes.NewService(quotes.NewClient(), cfg.QuoteCacheTTL)

	db, err := store.Open(cfg.DBPath)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer db.Close()
	approachRepo := approaches.NewRepository(db)
	if cfg.SeedDemoData {
		if err := approachRepo.SeedDemo(context.Background()); err != nil {
			log.Fatalf("seed demo data: %v", err)
		}
	}

	// Cancelled on shutdown so long-lived streams end instead of blocking it.
	baseCtx, cancelBase := context.WithCancel(context.Background())
	defer cancelBase()

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           api.New(cfg, quoteService, approachRepo).Routes(),
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

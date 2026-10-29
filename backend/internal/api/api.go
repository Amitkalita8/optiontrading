// Package api exposes the market endpoints over HTTP.
package api

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"optiontrading/backend/internal/approaches"
	"optiontrading/backend/internal/campaigns"
	"optiontrading/backend/internal/config"
	"optiontrading/backend/internal/insights"
	"optiontrading/backend/internal/market"
	"optiontrading/backend/internal/notifications"
	"optiontrading/backend/internal/positions"
	"optiontrading/backend/internal/profiles"
	"optiontrading/backend/internal/quotes"
	"optiontrading/backend/internal/tradelog"
	"optiontrading/backend/internal/users"
	"optiontrading/backend/internal/watchlists"
)

type API struct {
	cfg           config.Config
	db            *sql.DB
	quotes        *quotes.Service
	approaches    *approaches.Repository
	insights      *insights.Service
	watchlists    *watchlists.Repository
	campaigns     *campaigns.Repository
	positions     *positions.Repository
	tradeLog      *tradelog.Repository
	notifications *notifications.Repository
	users         *users.Repository
	profiles      *profiles.Repository
	now           func() time.Time
}

func New(
	cfg config.Config,
	db *sql.DB,
	q *quotes.Service,
	ap *approaches.Repository,
	in *insights.Service,
	wl *watchlists.Repository,
	cp *campaigns.Repository,
	pos *positions.Repository,
	tl *tradelog.Repository,
	notif *notifications.Repository,
	u *users.Repository,
) *API {
	return &API{
		cfg:           cfg,
		db:            db,
		quotes:        q,
		approaches:    ap,
		insights:      in,
		watchlists:    wl,
		campaigns:     cp,
		positions:     pos,
		tradeLog:      tl,
		notifications: notif,
		users:         u,
		profiles:      profiles.NewRepository(db),
		now:           time.Now,
	}
}

// Routes returns the router with middleware applied.
//
//	GET /api/health
//	GET /api/market/status
//	GET /api/market/quote/{symbol}?series=1
//	GET /api/market/quotes?symbols=AAPL,MSFT
//	GET /api/market/history/{symbol}?range=1D   (1D 1W 1M 3M 6M 1Y 3Y 5Y ALL)
//	GET /api/market/stream?symbols=AAPL,MSFT&series=1   (Server-Sent Events)
//	/api/approaches…                                   (see approaches.go)
//	/api/watchlists…                                   (see watchlists.go)
//	/api/campaigns…                                    (see campaigns.go)
//	/api/positions…                                    (see positions.go)
//	/api/trade-log…                                    (see tradelog.go)
//	/api/notifications…                                (see notifications.go)
//	/api/auth…                                         (see auth.go)
//	/phpmyadmin…                                       (see database_admin.go)
func (a *API) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", a.health)
	mux.HandleFunc("GET /api/market/status", a.marketStatus)
	mux.HandleFunc("GET /api/market/quote/{symbol}", a.quote)
	mux.HandleFunc("GET /api/market/quotes", a.quotesBatch)
	mux.HandleFunc("GET /api/market/history/{symbol}", a.history)
	mux.HandleFunc("GET /api/market/stream", a.stream)
	a.approachRoutes(mux)
	a.watchlistRoutes(mux)
	a.campaignRoutes(mux)
	a.positionRoutes(mux)
	a.tradelogRoutes(mux)
	a.notificationRoutes(mux)
	a.authRoutes(mux)
	a.accountRoutes(mux)
	a.profileRoutes(mux)
	a.dashboardRoutes(mux)
	mux.HandleFunc("POST /api/screener/ask", a.askScreener)
	a.databaseAdminRoutes(mux)
	return chain(mux, recoverer, logger, cors(a.cfg.AllowedOrigins), tokenAuth(a.cfg.APIToken))
}

func (a *API) userID(r *http.Request) string {
	if uid := strings.TrimSpace(r.Header.Get("X-User-Id")); uid != "" {
		return uid
	}
	if uid := strings.TrimSpace(r.URL.Query().Get("user_id")); uid != "" {
		return uid
	}
	return "default"
}

func (a *API) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *API) marketStatus(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, market.StatusAt(a.now()))
}

func (a *API) quote(w http.ResponseWriter, r *http.Request) {
	sym, err := quotes.NormalizeSymbol(r.PathValue("symbol"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	q, err := a.quotes.Get(r.Context(), sym)
	switch {
	case errors.Is(err, quotes.ErrNotFound):
		writeError(w, http.StatusNotFound, "no quote for "+sym)
		return
	case err != nil:
		log.Printf("quote %s: %v", sym, err)
		writeError(w, http.StatusBadGateway, "quote provider unavailable")
		return
	}
	if r.URL.Query().Get("series") != "1" {
		q.Series = nil
	}
	writeJSON(w, http.StatusOK, q)
}

// history returns the price series for a chart range (default 1D).
func (a *API) history(w http.ResponseWriter, r *http.Request) {
	sym, err := quotes.NormalizeSymbol(r.PathValue("symbol"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	key := r.URL.Query().Get("range")
	if key == "" {
		key = "1D"
	}
	rng, ok := quotes.ParseRange(key)
	if !ok {
		writeError(w, http.StatusBadRequest, "range must be one of 1D, 1W, 1M, 3M, 6M, 1Y, 3Y, 5Y, ALL")
		return
	}
	h, err := a.quotes.History(r.Context(), sym, rng)
	switch {
	case errors.Is(err, quotes.ErrNotFound):
		writeError(w, http.StatusNotFound, "no history for "+sym)
	case err != nil:
		log.Printf("history %s %s: %v", sym, rng.Key, err)
		writeError(w, http.StatusBadGateway, "quote provider unavailable")
	default:
		writeJSON(w, http.StatusOK, h)
	}
}

// batchResponse lists quotes in request order; failures are reported per symbol.
type batchResponse struct {
	Quotes []quotes.Quote    `json:"quotes"`
	Errors map[string]string `json:"errors,omitempty"`
}

func (a *API) quotesBatch(w http.ResponseWriter, r *http.Request) {
	symbols, err := parseSymbols(r.URL.Query().Get("symbols"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, a.fetchBatch(r, symbols, false))
}

func (a *API) fetchBatch(r *http.Request, symbols []string, withSeries bool) batchResponse {
	results := a.quotes.GetMany(r.Context(), symbols)
	resp := batchResponse{Quotes: make([]quotes.Quote, 0, len(symbols))}
	for _, sym := range symbols {
		res := results[sym]
		if res.Err != nil {
			if resp.Errors == nil {
				resp.Errors = map[string]string{}
			}
			if errors.Is(res.Err, quotes.ErrNotFound) {
				resp.Errors[sym] = "not found"
			} else {
				log.Printf("quote %s: %v", sym, res.Err)
				resp.Errors[sym] = "unavailable"
			}
			continue
		}
		q := res.Quote
		if !withSeries {
			q.Series = nil
		}
		resp.Quotes = append(resp.Quotes, q)
	}
	return resp
}

// parseSymbols turns "aapl, msft,AAPL" into ["AAPL","MSFT"] (deduped, validated).
func parseSymbols(raw string) ([]string, error) {
	seen := map[string]bool{}
	var out []string
	for _, part := range strings.Split(raw, ",") {
		if strings.TrimSpace(part) == "" {
			continue
		}
		sym, err := quotes.NormalizeSymbol(part)
		if err != nil {
			return nil, errors.New("invalid symbol: " + strings.TrimSpace(part))
		}
		if !seen[sym] {
			seen[sym] = true
			out = append(out, sym)
		}
	}
	switch {
	case len(out) == 0:
		return nil, errors.New("symbols query parameter is required")
	case len(out) > quotes.MaxSymbols:
		return nil, errors.New("too many symbols")
	}
	return out, nil
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("write json: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

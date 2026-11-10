package api

import (
	"context"
	"errors"
	"log"
	"net/http"
	"time"

	"optiontrading/backend/internal/positionintel"
	"optiontrading/backend/internal/positions"
	"optiontrading/backend/internal/quotes"
)

// Engine 02 — Existing Position Intelligence (signed-in user, X-User-Id):
//
//	GET  /api/positions/intelligence             every open position: health, recommended action, Greeks, P&L
//	GET  /api/positions/{id}/intelligence        full assessment (?refresh=1 to reassess now)
//	POST /api/positions/{id}/actions             {"actionId":"roll_shift","reviewedNetCredit":420}
//	                                             apply the confirmed action; 409 if the market moved
func (a *API) positionIntelRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/positions/intelligence", a.listPositionIntel)
	mux.HandleFunc("GET /api/positions/{id}/intelligence", a.getPositionIntel)
	mux.HandleFunc("POST /api/positions/{id}/actions", a.applyPositionAction)
}

// PositionIntel exposes the engine so main can run its background loop.
func (a *API) PositionIntel() *positionintel.Service { return a.posIntel }

func (a *API) listPositionIntel(w http.ResponseWriter, r *http.Request) {
	list, err := a.posIntel.List(r.Context(), a.userID(r))
	if err != nil {
		a.internalError(w, "position intelligence", err)
		return
	}
	if list == nil {
		list = []positionintel.Summary{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"positions": list, "generatedAt": a.now().UTC()})
}

func (a *API) getPositionIntel(w http.ResponseWriter, r *http.Request) {
	id, ok := pathInt64(w, r, "id")
	if !ok {
		return
	}
	as, err := a.posIntel.Get(r.Context(), id, a.userID(r), r.URL.Query().Get("refresh") == "1")
	a.writeIntel(w, as, err)
}

func (a *API) writeIntel(w http.ResponseWriter, v any, err error) {
	switch {
	case errors.Is(err, positions.ErrNotFound):
		writeError(w, http.StatusNotFound, "Position not found.")
	case errors.Is(err, positionintel.ErrNotOpen):
		writeError(w, http.StatusConflict, "This position is already closed.")
	case positionintel.IsStale(err):
		writeJSON(w, http.StatusConflict, map[string]string{"error": err.Error(), "code": "stale"})
	case err != nil:
		log.Printf("position intelligence: %v", err)
		writeError(w, http.StatusBadGateway, "Live option data is unavailable right now. Try again in a minute.")
	default:
		writeJSON(w, http.StatusOK, v)
	}
}

func (a *API) applyPositionAction(w http.ResponseWriter, r *http.Request) {
	id, ok := pathInt64(w, r, "id")
	if !ok {
		return
	}
	var in struct {
		ActionID          string   `json:"actionId"`
		ReviewedNetCredit *float64 `json:"reviewedNetCredit"`
	}
	if !decodeBody(w, r, &in) {
		return
	}
	if in.ActionID == "" {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "Choose an action.", "fields": map[string]string{"actionId": "Required."}})
		return
	}
	res, err := a.posIntel.Apply(r.Context(), id, a.userID(r), in.ActionID, in.ReviewedNetCredit)
	a.writeIntel(w, res, err)
}

// quoteHistory gives Engine 02 daily closes (entry and expiry prices).
type quoteHistory struct{ q *quotes.Service }

func (h quoteHistory) CloseOn(ctx context.Context, symbol string, day time.Time) (float64, error) {
	key := "1Y"
	if time.Since(day) > 360*24*time.Hour {
		key = "5Y"
	}
	rng, _ := quotes.ParseRange(key)
	hist, err := h.q.History(ctx, symbol, rng)
	if err != nil {
		return 0, err
	}
	end := day.Add(24 * time.Hour).UnixMilli()
	price := 0.0
	for _, p := range hist.Points {
		if p.T < end {
			price = p.P
		}
	}
	if price == 0 {
		return 0, errors.New("no close on or before that day")
	}
	return price, nil
}

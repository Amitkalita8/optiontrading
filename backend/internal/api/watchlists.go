package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"

	"optiontrading/backend/internal/watchlists"
)

//	GET    /api/watchlists          list all
//	POST   /api/watchlists          create
//	GET    /api/watchlists/{id}     get one
//	PUT    /api/watchlists/{id}     rename
//	PUT    /api/watchlists/{id}/tickers  replace ticker list
//	DELETE /api/watchlists/{id}     delete
func (a *API) watchlistRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/watchlists", a.listWatchlists)
	mux.HandleFunc("POST /api/watchlists", a.createWatchlist)
	mux.HandleFunc("GET /api/watchlists/{id}", a.getWatchlist)
	mux.HandleFunc("PUT /api/watchlists/{id}", a.renameWatchlist)
	mux.HandleFunc("PUT /api/watchlists/{id}/tickers", a.setWatchlistTickers)
	mux.HandleFunc("DELETE /api/watchlists/{id}", a.deleteWatchlist)
}

func (a *API) listWatchlists(w http.ResponseWriter, r *http.Request) {
	uid := a.userID(r)
	list, err := a.watchlists.List(r.Context(), uid)
	if err != nil {
		a.internalError(w, "list watchlists", err)
		return
	}
	if list == nil {
		list = []watchlists.Watchlist{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"watchlists": list})
}

func (a *API) createWatchlist(w http.ResponseWriter, r *http.Request) {
	var in watchlists.Input
	if !decodeBody(w, r, &in) {
		return
	}
	in.Normalize()
	if errs := in.Validate(); len(errs) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "Validation failed.", "fields": errs})
		return
	}
	uid := a.userID(r)
	wl, err := a.watchlists.Create(r.Context(), in, uid)
	if errors.Is(err, watchlists.ErrDuplicateName) {
		if list, listErr := a.watchlists.List(r.Context(), uid); listErr == nil {
			for _, item := range list {
				if strings.EqualFold(item.Name, in.Name) {
					if updated, setErr := a.watchlists.SetTickers(r.Context(), item.ID, in.Tickers, uid); setErr == nil {
						writeJSON(w, http.StatusOK, updated)
						return
					}
				}
			}
		}
	}
	if err != nil {
		a.watchlistError(w, err)
		return
	}
	w.Header().Set("Location", fmt.Sprintf("/api/watchlists/%d", wl.ID))
	writeJSON(w, http.StatusCreated, wl)
}

func (a *API) getWatchlist(w http.ResponseWriter, r *http.Request) {
	id, ok := pathInt64(w, r, "id")
	if !ok {
		return
	}
	wl, err := a.watchlists.Get(r.Context(), id, a.userID(r))
	if err != nil {
		a.watchlistError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, wl)
}

func (a *API) renameWatchlist(w http.ResponseWriter, r *http.Request) {
	id, ok := pathInt64(w, r, "id")
	if !ok {
		return
	}
	var body struct {
		Name string `json:"name"`
	}
	if !decodeBody(w, r, &body) {
		return
	}
	wl, err := a.watchlists.Rename(r.Context(), id, body.Name, a.userID(r))
	if err != nil {
		a.watchlistError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, wl)
}

func (a *API) setWatchlistTickers(w http.ResponseWriter, r *http.Request) {
	id, ok := pathInt64(w, r, "id")
	if !ok {
		return
	}
	var body struct {
		Tickers []string `json:"tickers"`
	}
	if !decodeBody(w, r, &body) {
		return
	}
	wl, err := a.watchlists.SetTickers(r.Context(), id, body.Tickers, a.userID(r))
	if err != nil {
		a.watchlistError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, wl)
}

func (a *API) deleteWatchlist(w http.ResponseWriter, r *http.Request) {
	id, ok := pathInt64(w, r, "id")
	if !ok {
		return
	}
	if err := a.watchlists.Delete(r.Context(), id, a.userID(r)); err != nil {
		a.watchlistError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) watchlistError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, watchlists.ErrNotFound):
		writeError(w, http.StatusNotFound, "Watchlist not found.")
	case errors.Is(err, watchlists.ErrDuplicateName):
		writeJSON(w, http.StatusConflict, map[string]any{
			"error":  "A watchlist with this name already exists.",
			"fields": watchlists.FieldErrors{"name": "This name is already in use."},
		})
	default:
		a.internalError(w, "watchlist", err)
	}
}

// decodeBody decodes a JSON request body into v, writing error responses on failure.
func decodeBody(w http.ResponseWriter, r *http.Request, v any) bool {
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	if err := dec.Decode(v); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body: "+err.Error())
		return false
	}
	if err := dec.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		writeError(w, http.StatusBadRequest, "body must contain a single JSON object")
		return false
	}
	return true
}

// pathInt64 parses a path value as a positive int64.
func pathInt64(w http.ResponseWriter, r *http.Request, name string) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue(name), 10, 64)
	if err != nil || id <= 0 {
		writeError(w, http.StatusBadRequest, "invalid "+name)
		return 0, false
	}
	return id, true
}

// defaultUser is used until backend auth is fully implemented.
// All data is stored under this key so a future user-id claim can replace it.
const defaultUser = "default"

func init() {
	log.Print("watchlist routes registered")
}

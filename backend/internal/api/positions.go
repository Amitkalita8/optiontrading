package api

import (
	"errors"
	"fmt"
	"net/http"

	"optiontrading/backend/internal/positions"
)

func (a *API) positionRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/positions", a.listPositions)
	mux.HandleFunc("POST /api/positions", a.createPosition)
	mux.HandleFunc("GET /api/positions/{id}", a.getPosition)
	mux.HandleFunc("PUT /api/positions/{id}", a.updatePosition)
	mux.HandleFunc("DELETE /api/positions/{id}", a.deletePosition)
}

func (a *API) listPositions(w http.ResponseWriter, r *http.Request) {
	list, err := a.positions.List(r.Context(), a.userID(r))
	if err != nil {
		a.internalError(w, "list positions", err)
		return
	}
	if list == nil {
		list = []positions.Position{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"positions": list})
}

func (a *API) getPosition(w http.ResponseWriter, r *http.Request) {
	id, ok := pathInt64(w, r, "id")
	if !ok {
		return
	}
	p, err := a.positions.Get(r.Context(), id, a.userID(r))
	if err != nil {
		a.positionError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (a *API) createPosition(w http.ResponseWriter, r *http.Request) {
	var in positions.Input
	if !decodeBody(w, r, &in) {
		return
	}
	p, err := a.positions.Create(r.Context(), in, a.userID(r))
	if err != nil {
		a.internalError(w, "create position", err)
		return
	}
	w.Header().Set("Location", fmt.Sprintf("/api/positions/%d", p.ID))
	writeJSON(w, http.StatusCreated, p)
}

func (a *API) updatePosition(w http.ResponseWriter, r *http.Request) {
	id, ok := pathInt64(w, r, "id")
	if !ok {
		return
	}
	var in positions.Input
	if !decodeBody(w, r, &in) {
		return
	}
	p, err := a.positions.Update(r.Context(), id, in, a.userID(r))
	if err != nil {
		a.positionError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (a *API) deletePosition(w http.ResponseWriter, r *http.Request) {
	id, ok := pathInt64(w, r, "id")
	if !ok {
		return
	}
	if err := a.positions.Delete(r.Context(), id, a.userID(r)); err != nil {
		a.positionError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) positionError(w http.ResponseWriter, err error) {
	if errors.Is(err, positions.ErrNotFound) {
		writeError(w, http.StatusNotFound, "Position not found.")
	} else {
		a.internalError(w, "position", err)
	}
}

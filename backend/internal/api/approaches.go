package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"

	"optiontrading/backend/internal/approaches"
)

const maxBodyBytes = 64 << 10

// Trade approach endpoints:
//
//	GET    /api/approaches          list
//	GET    /api/approaches/options  allowed values (strategies, moneyness, …)
//	GET    /api/approaches/{id}     one approach
//	POST   /api/approaches          create   (201)
//	PUT    /api/approaches/{id}     update
//	DELETE /api/approaches/{id}     delete   (204; 409 if used by campaigns)
func (a *API) approachRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/approaches", a.listApproaches)
	mux.HandleFunc("GET /api/approaches/options", a.approachOptions)
	mux.HandleFunc("GET /api/approaches/{id}", a.getApproach)
	mux.HandleFunc("POST /api/approaches", a.createApproach)
	mux.HandleFunc("PUT /api/approaches/{id}", a.updateApproach)
	mux.HandleFunc("DELETE /api/approaches/{id}", a.deleteApproach)
}

func (a *API) listApproaches(w http.ResponseWriter, r *http.Request) {
	list, err := a.approaches.List(r.Context())
	if err != nil {
		a.internalError(w, "list approaches", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"approaches": list})
}

func (a *API) approachOptions(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, approaches.AllOptions)
}

func (a *API) getApproach(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	ap, err := a.approaches.Get(r.Context(), id)
	if err != nil {
		a.approachError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ap)
}

func (a *API) createApproach(w http.ResponseWriter, r *http.Request) {
	in, ok := decodeApproachInput(w, r)
	if !ok {
		return
	}
	ap, err := a.approaches.Create(r.Context(), in)
	if err != nil {
		a.approachError(w, err)
		return
	}
	w.Header().Set("Location", fmt.Sprintf("/api/approaches/%d", ap.ID))
	writeJSON(w, http.StatusCreated, ap)
}

func (a *API) updateApproach(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	in, ok := decodeApproachInput(w, r)
	if !ok {
		return
	}
	ap, err := a.approaches.Update(r.Context(), id, in)
	if err != nil {
		a.approachError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ap)
}

func (a *API) deleteApproach(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	if err := a.approaches.Delete(r.Context(), id); err != nil {
		a.approachError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// decodeApproachInput parses, normalises and validates the request body,
// writing a 400/422 response and returning ok=false on failure.
func decodeApproachInput(w http.ResponseWriter, r *http.Request) (approaches.Input, bool) {
	var in approaches.Input
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body: "+err.Error())
		return in, false
	}
	if err := dec.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		writeError(w, http.StatusBadRequest, "body must contain a single JSON object")
		return in, false
	}
	in.Normalize()
	if errs := in.Validate(); len(errs) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{
			"error":  "Some fields need attention.",
			"fields": errs,
		})
		return in, false
	}
	return in, true
}

func pathID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		writeError(w, http.StatusBadRequest, "invalid approach id")
		return 0, false
	}
	return id, true
}

func (a *API) approachError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, approaches.ErrNotFound):
		writeError(w, http.StatusNotFound, "Approach not found.")
	case errors.Is(err, approaches.ErrDuplicateName):
		writeJSON(w, http.StatusConflict, map[string]any{
			"error":  "An approach with this name already exists.",
			"fields": approaches.FieldErrors{"name": "This name is already used by another approach."},
		})
	case errors.Is(err, approaches.ErrInUse):
		writeError(w, http.StatusConflict, "This approach is used by campaigns, so it can't be deleted.")
	default:
		a.internalError(w, "approach", err)
	}
}

func (a *API) internalError(w http.ResponseWriter, what string, err error) {
	log.Printf("%s: %v", what, err)
	writeError(w, http.StatusInternalServerError, "Something went wrong. Please try again.")
}

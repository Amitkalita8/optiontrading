package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"optiontrading/backend/internal/profiles"
)

// maxProfileBody leaves room for the resized photo data URL.
const maxProfileBody = profiles.MaxPhotoBytes + 16<<10

// Profile endpoints (Settings › Profile) for the user in X-User-Id:
//
//	GET /api/profile   {"profile": {...}} or {"profile": null} if never saved
//	PUT /api/profile   save; 422 {error, fields} on invalid input
func (a *API) profileRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/profile", a.getProfile)
	mux.HandleFunc("PUT /api/profile", a.saveProfile)
}

func (a *API) getProfile(w http.ResponseWriter, r *http.Request) {
	p, err := a.profiles.Get(r.Context(), a.userID(r))
	switch {
	case errors.Is(err, profiles.ErrNotFound):
		writeJSON(w, http.StatusOK, map[string]any{"profile": nil})
	case err != nil:
		a.internalError(w, "get profile", err)
	default:
		writeJSON(w, http.StatusOK, map[string]any{"profile": p})
	}
}

func (a *API) saveProfile(w http.ResponseWriter, r *http.Request) {
	var in profiles.Profile
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxProfileBody)).Decode(&in); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body (is the photo too large?)")
		return
	}
	in.UserID = a.userID(r)
	in.Normalize()
	if fields := in.Validate(); len(fields) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "Check the highlighted fields.", "fields": fields})
		return
	}
	saved, err := a.profiles.Save(r.Context(), in)
	if err != nil {
		a.internalError(w, "save profile", err)
		return
	}
	// Keep the account name in step (no-op for users without an account row).
	if a.users != nil {
		if err := a.users.UpdateName(r.Context(), in.UserID, saved.FullName); err != nil {
			a.internalError(w, "update account name", err)
			return
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"profile": saved})
}

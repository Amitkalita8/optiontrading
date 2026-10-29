package api

import (
	"errors"
	"net/http"
	"strings"
	"unicode/utf8"

	"optiontrading/backend/internal/users"
)

// minPasswordLen matches PASSWORD_MIN_LENGTH in the frontend auth config.
const minPasswordLen = 8

// Account endpoints for Settings › Security & Privacy. The signed-in user is
// identified by X-User-Id (their email), like the rest of the API.
// (GET /api/auth/me lives in auth.go.)
//
//	POST /api/auth/change-password    {currentPassword, newPassword}
func (a *API) accountRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/auth/change-password", a.handleChangePassword)
}

func (a *API) currentUser(w http.ResponseWriter, r *http.Request) (*users.User, bool) {
	if a.users == nil {
		writeError(w, http.StatusServiceUnavailable, "user service not available")
		return nil, false
	}
	u, err := a.users.FindByEmail(r.Context(), a.userID(r))
	if errors.Is(err, users.ErrNotFound) {
		writeError(w, http.StatusNotFound, "No account found for this session. Log in again.")
		return nil, false
	}
	if err != nil {
		a.internalError(w, "find user", err)
		return nil, false
	}
	return u, true
}

type changePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

func (a *API) handleChangePassword(w http.ResponseWriter, r *http.Request) {
	var in changePasswordRequest
	if !decodeBody(w, r, &in) {
		return
	}
	u, ok := a.currentUser(w, r)
	if !ok {
		return
	}
	if u.Provider == "google" {
		writeError(w, http.StatusBadRequest, "This account signs in with Google, so it has no password to change.")
		return
	}
	if u.PasswordHash != "" && users.HashPassword(in.CurrentPassword) != u.PasswordHash {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{
			"error": "Current password is incorrect.", "fields": map[string]string{"currentPassword": "Current password is incorrect."},
		})
		return
	}
	if utf8.RuneCountInString(strings.TrimSpace(in.NewPassword)) < minPasswordLen {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{
			"error": "Password is too short.", "fields": map[string]string{"newPassword": "Use at least 8 characters."},
		})
		return
	}
	if in.NewPassword == in.CurrentPassword {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{
			"error": "Choose a new password.", "fields": map[string]string{"newPassword": "Choose a password you haven't used here."},
		})
		return
	}
	updated, err := a.users.UpdatePassword(r.Context(), u.Email, users.HashPassword(in.NewPassword))
	if err != nil {
		a.internalError(w, "update password", err)
		return
	}
	writeJSON(w, http.StatusOK, authResponse{User: *updated})
}

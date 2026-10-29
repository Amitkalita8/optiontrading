package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"optiontrading/backend/internal/users"
)

type registerRequest struct {
	Name      string `json:"name"`
	Email     string `json:"email"`
	Password  string `json:"password"`
	Provider  string `json:"provider"`
	AvatarURL string `json:"avatar_url"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authResponse struct {
	User users.User `json:"user"`
}

func (a *API) authRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/auth/register", a.handleRegister)
	mux.HandleFunc("POST /api/auth/signup", a.handleRegister)
	mux.HandleFunc("POST /api/auth/login", a.handleLogin)
	mux.HandleFunc("GET /api/auth/me", a.handleMe)
	mux.HandleFunc("GET /api/users", a.handleListUsers)
}

func (a *API) handleRegister(w http.ResponseWriter, r *http.Request) {
	if a.users == nil {
		writeError(w, http.StatusServiceUnavailable, "user service not available")
		return
	}

	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.TrimSpace(req.Email)
	if req.Name == "" || req.Email == "" {
		writeError(w, http.StatusBadRequest, "name and email are required")
		return
	}

	if req.Provider == "" {
		req.Provider = "email"
	}

	// Check if already exists (idempotent registration / sync)
	existing, err := a.users.FindByEmail(r.Context(), req.Email)
	if err == nil && existing != nil {
		writeJSON(w, http.StatusOK, authResponse{User: *existing})
		return
	}

	u := users.User{
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: users.HashPassword(req.Password),
		Provider:     req.Provider,
		AvatarURL:    req.AvatarURL,
	}

	if err := a.users.Create(r.Context(), &u); err != nil {
		if errors.Is(err, users.ErrAlreadyExists) {
			writeError(w, http.StatusConflict, "user already exists")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to register user: "+err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, authResponse{User: u})
}

func (a *API) handleLogin(w http.ResponseWriter, r *http.Request) {
	if a.users == nil {
		writeError(w, http.StatusServiceUnavailable, "user service not available")
		return
	}

	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Email = strings.TrimSpace(req.Email)
	if req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "email and password are required")
		return
	}

	u, err := a.users.FindByEmail(r.Context(), req.Email)
	if errors.Is(err, users.ErrNotFound) {
		writeError(w, http.StatusUnauthorized, "incorrect email or password")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query user: "+err.Error())
		return
	}

	expectedHash := users.HashPassword(req.Password)
	if u.PasswordHash != "" && u.PasswordHash != expectedHash {
		writeError(w, http.StatusUnauthorized, "incorrect email or password")
		return
	}

	writeJSON(w, http.StatusOK, authResponse{User: *u})
}

func (a *API) handleListUsers(w http.ResponseWriter, r *http.Request) {
	if a.users == nil {
		writeError(w, http.StatusServiceUnavailable, "user service not available")
		return
	}
	list, err := a.users.List(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list users: "+err.Error())
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (a *API) handleMe(w http.ResponseWriter, r *http.Request) {
	if a.users == nil {
		writeError(w, http.StatusServiceUnavailable, "user service not available")
		return
	}
	uid := a.userID(r)
	if uid == "" || uid == "default" {
		list, err := a.users.List(r.Context())
		if err == nil && len(list) > 0 {
			writeJSON(w, http.StatusOK, authResponse{User: list[0]})
			return
		}
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	u, err := a.users.FindByIDOrEmail(r.Context(), uid)
	if err != nil || u == nil {
		list, _ := a.users.List(r.Context())
		if len(list) > 0 {
			writeJSON(w, http.StatusOK, authResponse{User: list[0]})
			return
		}
		writeError(w, http.StatusUnauthorized, "user not found")
		return
	}
	writeJSON(w, http.StatusOK, authResponse{User: *u})
}

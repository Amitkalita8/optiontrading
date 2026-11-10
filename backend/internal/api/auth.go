package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"
	"time"
	"unicode/utf8"

	"optiontrading/backend/internal/users"
)

type registerRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type googleRequest struct {
	AccessToken string `json:"access_token"`
	IDToken     string `json:"id_token"`
}

// authResponse is the account; Token is set when the call signs the user in.
type authResponse struct {
	User  users.User `json:"user"`
	Token string     `json:"token,omitempty"`
}

func (a *API) authRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/auth/register", a.handleRegister)
	mux.HandleFunc("POST /api/auth/signup", a.handleRegister)
	mux.HandleFunc("POST /api/auth/login", a.handleLogin)
	mux.HandleFunc("POST /api/auth/google", a.handleGoogle)
	mux.HandleFunc("GET /api/auth/me", a.handleMe)
}

func (a *API) signedIn(w http.ResponseWriter, status int, u users.User) {
	writeJSON(w, status, authResponse{User: u, Token: a.newSession(u.Email)})
}

// handleRegister creates an email/password account and signs it in.
func (a *API) handleRegister(w http.ResponseWriter, r *http.Request) {
	if a.users == nil {
		writeError(w, http.StatusServiceUnavailable, "user service not available")
		return
	}
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Name == "" || req.Email == "" || !strings.Contains(req.Email, "@") {
		writeError(w, http.StatusBadRequest, "name and a valid email are required")
		return
	}
	if utf8.RuneCountInString(strings.TrimSpace(req.Password)) < minPasswordLen {
		writeError(w, http.StatusBadRequest, "Password must be at least 8 characters.")
		return
	}
	if existing, err := a.users.FindByEmail(r.Context(), req.Email); err == nil && existing != nil {
		writeError(w, http.StatusConflict, "An account with this email already exists. Sign in instead.")
		return
	}
	u := users.User{
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: users.HashPassword(req.Password),
		Provider:     "email",
	}
	if err := a.users.Create(r.Context(), &u); err != nil {
		if errors.Is(err, users.ErrAlreadyExists) {
			writeError(w, http.StatusConflict, "An account with this email already exists. Sign in instead.")
			return
		}
		a.internalError(w, "register user", err)
		return
	}
	a.signedIn(w, http.StatusCreated, u)
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
		writeError(w, http.StatusUnauthorized, "Incorrect email or password.")
		return
	}
	if err != nil {
		a.internalError(w, "find user", err)
		return
	}
	// No password stored (Google accounts, or accounts copied from the old
	// browser-only sign-up): never accept a typed password for them.
	if !users.HasPassword(u.PasswordHash) {
		msg := "This account doesn't have a password yet. Use “Forgot password” to set one."
		if u.Provider == "google" {
			msg = "This account uses Google sign-in. Continue with Google instead."
		}
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": msg, "code": "password_not_set"})
		return
	}
	ok, upgrade := users.CheckPassword(u.PasswordHash, req.Password)
	if !ok {
		writeError(w, http.StatusUnauthorized, "Incorrect email or password.")
		return
	}
	if upgrade {
		if updated, err := a.users.UpdatePassword(r.Context(), u.Email, users.HashPassword(req.Password)); err == nil {
			u = updated
		}
	}
	a.signedIn(w, http.StatusOK, *u)
}

// Google endpoints; tests point these at a fake server.
var (
	googleTokenInfoURL = "https://oauth2.googleapis.com/tokeninfo"
	googleUserInfoURL  = "https://www.googleapis.com/oauth2/v3/userinfo"
	googleHTTP         = &http.Client{Timeout: 10 * time.Second}
)

type googleIdentity struct {
	Aud           string `json:"aud"`
	Azp           string `json:"azp"`
	Email         string `json:"email"`
	EmailVerified any    `json:"email_verified"` // "true" from tokeninfo, true from userinfo
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

func (g googleIdentity) verified() bool {
	return g.EmailVerified == true || g.EmailVerified == "true"
}

func googleGet(u string, header http.Header, out any) error {
	req, err := http.NewRequest(http.MethodGet, u, nil)
	if err != nil {
		return err
	}
	for k, v := range header {
		req.Header[k] = v
	}
	res, err := googleHTTP.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return errors.New("google: " + res.Status)
	}
	return json.NewDecoder(res.Body).Decode(out)
}

// handleGoogle signs in with a Google token the frontend got from Google.
// The server asks Google itself who the token belongs to and checks it was
// issued to this app (GOOGLE_CLIENT_ID), so a client can't claim an email.
func (a *API) handleGoogle(w http.ResponseWriter, r *http.Request) {
	if a.users == nil {
		writeError(w, http.StatusServiceUnavailable, "user service not available")
		return
	}
	if a.cfg.GoogleClientID == "" {
		writeError(w, http.StatusServiceUnavailable, "Google sign-in isn't configured on the server (GOOGLE_CLIENT_ID).")
		return
	}
	var req googleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || (req.AccessToken == "" && req.IDToken == "") {
		writeError(w, http.StatusBadRequest, "access_token or id_token is required")
		return
	}

	var id googleIdentity
	q := url.Values{}
	if req.IDToken != "" {
		q.Set("id_token", req.IDToken)
	} else {
		q.Set("access_token", req.AccessToken)
	}
	if err := googleGet(googleTokenInfoURL+"?"+q.Encode(), nil, &id); err != nil {
		writeError(w, http.StatusUnauthorized, "Google sign-in failed. Please try again.")
		return
	}
	if id.Aud != a.cfg.GoogleClientID && id.Azp != a.cfg.GoogleClientID {
		writeError(w, http.StatusUnauthorized, "This Google token was issued to a different app.")
		return
	}
	// Access-token info has no name or photo; userinfo does.
	if req.IDToken == "" {
		var profile googleIdentity
		if err := googleGet(googleUserInfoURL, http.Header{"Authorization": {"Bearer " + req.AccessToken}}, &profile); err == nil {
			id.Name, id.Picture = profile.Name, profile.Picture
			if id.EmailVerified == nil {
				id.EmailVerified = profile.EmailVerified
			}
		}
	}
	email := strings.ToLower(strings.TrimSpace(id.Email))
	if email == "" || !id.verified() {
		writeError(w, http.StatusUnauthorized, "Your Google email address isn't verified.")
		return
	}

	u, err := a.users.FindByEmail(r.Context(), email)
	if errors.Is(err, users.ErrNotFound) {
		name := strings.TrimSpace(id.Name)
		if name == "" {
			name = email
		}
		nu := users.User{Name: name, Email: email, Provider: "google", AvatarURL: id.Picture}
		if err := a.users.Create(r.Context(), &nu); err != nil {
			a.internalError(w, "create google user", err)
			return
		}
		a.signedIn(w, http.StatusCreated, nu)
		return
	}
	if err != nil {
		a.internalError(w, "find user", err)
		return
	}
	a.signedIn(w, http.StatusOK, *u)
}

// handleMe returns the signed-in account.
func (a *API) handleMe(w http.ResponseWriter, r *http.Request) {
	if a.users == nil {
		writeError(w, http.StatusServiceUnavailable, "user service not available")
		return
	}
	uid := a.userID(r)
	if uid == "default" {
		writeError(w, http.StatusUnauthorized, "Not signed in.")
		return
	}
	u, err := a.users.FindByEmail(r.Context(), uid)
	if err != nil || u == nil {
		writeError(w, http.StatusUnauthorized, "No account found for this session. Log in again.")
		return
	}
	writeJSON(w, http.StatusOK, authResponse{User: *u})
}

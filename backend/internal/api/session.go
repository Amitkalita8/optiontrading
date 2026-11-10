package api

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Sign-in sessions.
//
// Login, sign-up and Google sign-in return a token. The frontend sends it as
// "Authorization: Bearer <token>", and userID reads the signed-in email from
// it. The token is "<base64url(email|expiry)>.<base64url(HMAC-SHA256)>",
// signed with SESSION_SECRET, so nobody can make one for another account.

const sessionTTL = 30 * 24 * time.Hour

var (
	randomSecretOnce sync.Once
	randomSecret     []byte
)

func (a *API) sessionKey() []byte {
	if a.cfg.SessionSecret != "" {
		return []byte(a.cfg.SessionSecret)
	}
	randomSecretOnce.Do(func() {
		randomSecret = make([]byte, 32)
		if _, err := rand.Read(randomSecret); err != nil {
			panic(err)
		}
		log.Print("SESSION_SECRET is not set: using a random one, so sign-ins end when the server restarts")
	})
	return randomSecret
}

func (a *API) sign(payload string) string {
	mac := hmac.New(sha256.New, a.sessionKey())
	mac.Write([]byte(payload))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

// newSession returns a token for the account with this email.
func (a *API) newSession(email string) string {
	exp := a.now().Add(sessionTTL).Unix()
	payload := base64.RawURLEncoding.EncodeToString([]byte(strings.ToLower(strings.TrimSpace(email)) + "|" + strconv.FormatInt(exp, 10)))
	return payload + "." + a.sign(payload)
}

// sessionEmail returns the email in a valid, unexpired token.
func (a *API) sessionEmail(token string) (string, bool) {
	payload, sig, ok := strings.Cut(token, ".")
	if !ok || !hmac.Equal([]byte(sig), []byte(a.sign(payload))) {
		return "", false
	}
	raw, err := base64.RawURLEncoding.DecodeString(payload)
	if err != nil {
		return "", false
	}
	email, expStr, ok := strings.Cut(string(raw), "|")
	exp, err := strconv.ParseInt(expStr, 10, 64)
	if !ok || err != nil || email == "" || a.now().Unix() >= exp {
		return "", false
	}
	return email, true
}

// bearer returns the token in "Authorization: Bearer <token>".
func bearer(header string) string {
	if len(header) > 7 && strings.EqualFold(header[:7], "Bearer ") {
		return strings.TrimSpace(header[7:])
	}
	return ""
}

// Endpoints that work without signing in; a stale token sent to them is ignored.
var publicAuthPaths = map[string]bool{
	"/api/auth/login": true, "/api/auth/register": true, "/api/auth/signup": true, "/api/auth/google": true,
	"/api/auth/forgot": true, "/api/auth/verify-code": true, "/api/auth/reset-password": true,
}

// rejectBadSessions answers 401 when a request carries a session token that
// is expired or invalid, so the app signs the user out instead of quietly
// showing the shared demo data.
func (a *API) rejectBadSessions(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := bearer(r.Header.Get("Authorization"))
		if token != "" && strings.HasPrefix(r.URL.Path, "/api/") && !publicAuthPaths[r.URL.Path] {
			_, ok := a.sessionEmail(token)
			apiToken := a.cfg.APIToken != "" && subtle.ConstantTimeCompare([]byte(token), []byte(a.cfg.APIToken)) == 1
			if !ok && !apiToken {
				writeJSON(w, http.StatusUnauthorized, map[string]string{
					"error": "Your session has expired. Sign in again.", "code": "session_expired",
				})
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

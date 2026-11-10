package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"optiontrading/backend/internal/config"
)

const (
	testSessionSecret = "test-session-secret"
	testGoogleClient  = "test-client.apps.googleusercontent.com"
)

// signIn adds the session token for user (an email) to req; "" stays signed out.
func signIn(req *http.Request, user string) {
	if user != "" {
		req.Header.Set("Authorization", "Bearer "+testToken(user))
	}
}

func testToken(email string) string {
	a := &API{cfg: config.Config{SessionSecret: testSessionSecret}, now: time.Now}
	return a.newSession(email)
}

// fakeGoogle answers tokeninfo/userinfo as Google would for email, with the
// token issued to client.
func fakeGoogle(t *testing.T, email, client string) {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("access_token") == "bad" {
			http.Error(w, `{"error":"invalid_token"}`, http.StatusBadRequest)
			return
		}
		json.NewEncoder(w).Encode(map[string]any{
			"aud": client, "azp": client, "email": email, "email_verified": "true", "name": "Google User",
		})
	}))
	oldInfo, oldUser := googleTokenInfoURL, googleUserInfoURL
	googleTokenInfoURL, googleUserInfoURL = srv.URL+"/tokeninfo", srv.URL+"/userinfo"
	t.Cleanup(func() {
		googleTokenInfoURL, googleUserInfoURL = oldInfo, oldUser
		srv.Close()
	})
}

func authCall(t *testing.T, method, url, header, body string) (int, map[string]any) {
	t.Helper()
	req, _ := http.NewRequest(method, url, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if header != "" {
		req.Header.Set("Authorization", header)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var out map[string]any
	json.NewDecoder(res.Body).Decode(&out)
	return res.StatusCode, out
}

func TestLoginReturnsWorkingSession(t *testing.T) {
	srv := newTestServer(t)
	code, out := authCall(t, "POST", srv.URL+"/api/auth/register", "", `{"name":"Ann","email":"Ann@Example.com","password":"password1"}`)
	if code != http.StatusCreated || out["token"] == nil {
		t.Fatalf("register = %d %v, want 201 with a token", code, out)
	}
	code, out = authCall(t, "POST", srv.URL+"/api/auth/login", "", `{"email":"ann@example.com","password":"password1"}`)
	token, _ := out["token"].(string)
	if code != http.StatusOK || token == "" {
		t.Fatalf("login = %d %v", code, out)
	}
	code, out = authCall(t, "GET", srv.URL+"/api/auth/me", "Bearer "+token, "")
	if user, _ := out["user"].(map[string]any); code != 200 || user["email"] != "ann@example.com" {
		t.Fatalf("me = %d %v", code, out)
	}
}

func TestIdentityCannotBeClaimed(t *testing.T) {
	srv := newTestServer(t)
	authCall(t, "POST", srv.URL+"/api/auth/register", "", `{"name":"Vic","email":"victim@example.com","password":"password1"}`)

	// The old X-User-Id header no longer identifies anyone.
	req, _ := http.NewRequest("GET", srv.URL+"/api/auth/me", nil)
	req.Header.Set("X-User-Id", "victim@example.com")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != http.StatusUnauthorized {
		t.Errorf("me with X-User-Id only = %d, want 401", res.StatusCode)
	}

	// No token, a forged token, a token signed with another secret.
	other := &API{cfg: config.Config{SessionSecret: "someone-else"}, now: time.Now}
	for name, header := range map[string]string{
		"none":         "",
		"forged":       "Bearer dmljdGltQGV4YW1wbGUuY29tfDk5OTk5OTk5OTk.AAAA",
		"other secret": "Bearer " + other.newSession("victim@example.com"),
	} {
		if code, _ := authCall(t, "GET", srv.URL+"/api/auth/me", header, ""); code != http.StatusUnauthorized {
			t.Errorf("%s: me = %d, want 401", name, code)
		}
	}

	// Expired token.
	old := &API{cfg: config.Config{SessionSecret: testSessionSecret}, now: func() time.Time { return time.Now().Add(-sessionTTL - time.Hour) }}
	if code, _ := authCall(t, "GET", srv.URL+"/api/auth/me", "Bearer "+old.newSession("victim@example.com"), ""); code != http.StatusUnauthorized {
		t.Errorf("expired token: me = %d, want 401", code)
	}

	// The user list is gone, and password-less register can't claim the email.
	if code, _ := authCall(t, "GET", srv.URL+"/api/users", "", ""); code == http.StatusOK {
		t.Errorf("GET /api/users = %d, want it removed", code)
	}
	if code, _ := authCall(t, "POST", srv.URL+"/api/auth/register", "", `{"name":"X","email":"victim@example.com"}`); code == http.StatusOK || code == http.StatusCreated {
		t.Errorf("password-less register of an existing email = %d", code)
	}
}

func TestGoogleSignIn(t *testing.T) {
	srv := newTestServer(t)

	fakeGoogle(t, "g@example.com", "another-app")
	if code, _ := authCall(t, "POST", srv.URL+"/api/auth/google", "", `{"access_token":"tok"}`); code != http.StatusUnauthorized {
		t.Errorf("token for another app = %d, want 401", code)
	}
	if code, _ := authCall(t, "POST", srv.URL+"/api/auth/google", "", `{"access_token":"bad"}`); code != http.StatusUnauthorized {
		t.Errorf("invalid token = %d, want 401", code)
	}

	fakeGoogle(t, "G@Example.com", testGoogleClient)
	code, out := authCall(t, "POST", srv.URL+"/api/auth/google", "", `{"access_token":"tok"}`)
	token, _ := out["token"].(string)
	if code != http.StatusCreated || token == "" {
		t.Fatalf("first google sign-in = %d %v", code, out)
	}
	if code, _ := authCall(t, "POST", srv.URL+"/api/auth/google", "", `{"access_token":"tok"}`); code != http.StatusOK {
		t.Errorf("second google sign-in = %d, want 200", code)
	}
	code, out = authCall(t, "GET", srv.URL+"/api/auth/me", "Bearer "+token, "")
	if user, _ := out["user"].(map[string]any); code != 200 || user["email"] != "g@example.com" || user["provider"] != "google" {
		t.Errorf("me = %d %v", code, out)
	}
}

func TestDatabaseViewerOffInProduction(t *testing.T) {
	a := &API{cfg: config.Config{Production: true}, now: time.Now}
	rec := httptest.NewRecorder()
	a.handleDatabaseAdmin(rec, httptest.NewRequest("GET", "/phpmyadmin", nil))
	if rec.Code != http.StatusNotFound {
		t.Errorf("production without DB_ADMIN_PASSWORD = %d, want 404", rec.Code)
	}

	a.cfg.DBAdminPassword = "s3cret-pass"
	rec = httptest.NewRecorder()
	a.handleDatabaseAdmin(rec, httptest.NewRequest("GET", "/phpmyadmin", nil))
	body := rec.Body.String()
	if rec.Code != http.StatusOK || strings.Contains(body, "s3cret-pass") || strings.Contains(body, localAdminPassword) {
		t.Errorf("login page = %d, must not show any password", rec.Code)
	}
}

func TestExpiredSessionGets401(t *testing.T) {
	srv := newTestServer(t)
	old := &API{cfg: config.Config{SessionSecret: testSessionSecret}, now: func() time.Time { return time.Now().Add(-sessionTTL - time.Hour) }}
	code, out := authCall(t, "GET", srv.URL+"/api/campaigns", "Bearer "+old.newSession("a@example.com"), "")
	if code != http.StatusUnauthorized || out["code"] != "session_expired" {
		t.Errorf("campaigns with expired token = %d %v, want 401 session_expired", code, out)
	}
	// Signing in again still works with the stale token attached.
	authCall(t, "POST", srv.URL+"/api/auth/register", "", `{"name":"X","email":"x@example.com","password":"password1"}`)
	if code, _ := authCall(t, "POST", srv.URL+"/api/auth/login", "Bearer stale", `{"email":"x@example.com","password":"password1"}`); code != http.StatusOK {
		t.Errorf("login with a stale token attached = %d, want 200", code)
	}
	// Signed-out requests still get the demo data.
	if code, _ := authCall(t, "GET", srv.URL+"/api/campaigns", "", ""); code != http.StatusOK {
		t.Errorf("signed-out campaigns = %d, want 200", code)
	}
}

package api

import (
	"net/http"
	"strings"
	"testing"
)

func doJSON(t *testing.T, method, url, user, body string) int {
	t.Helper()
	req, _ := http.NewRequest(method, url, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	signIn(req, user)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	return res.StatusCode
}

func TestChangePassword(t *testing.T) {
	srv := newTestServer(t)
	const email = "pw@example.com"
	if code := doJSON(t, "POST", srv.URL+"/api/auth/register", "", `{"name":"P W","email":"`+email+`","password":"oldpassword"}`); code != http.StatusCreated && code != http.StatusOK {
		t.Fatalf("register = %d", code)
	}

	cases := []struct {
		name, body string
		want       int
	}{
		{"wrong current", `{"currentPassword":"nope","newPassword":"newpassword1"}`, http.StatusUnprocessableEntity},
		{"too short", `{"currentPassword":"oldpassword","newPassword":"short"}`, http.StatusUnprocessableEntity},
		{"ok", `{"currentPassword":"oldpassword","newPassword":"newpassword1"}`, http.StatusOK},
	}
	for _, c := range cases {
		if got := doJSON(t, "POST", srv.URL+"/api/auth/change-password", email, c.body); got != c.want {
			t.Errorf("%s: status %d, want %d", c.name, got, c.want)
		}
	}

	if got := doJSON(t, "POST", srv.URL+"/api/auth/login", "", `{"email":"`+email+`","password":"newpassword1"}`); got != http.StatusOK {
		t.Errorf("login with new password = %d", got)
	}
	if got := doJSON(t, "POST", srv.URL+"/api/auth/login", "", `{"email":"`+email+`","password":"oldpassword"}`); got != http.StatusUnauthorized {
		t.Errorf("login with old password = %d, want 401", got)
	}
}

func TestLoginWithoutStoredPassword(t *testing.T) {
	srv := newTestServer(t)
	// Created by Google sign-in, so it has no password.
	fakeGoogle(t, "sync@example.com", testGoogleClient)
	if got := doJSON(t, "POST", srv.URL+"/api/auth/google", "", `{"access_token":"tok"}`); got != 201 {
		t.Fatalf("google sign-in = %d", got)
	}
	code, out := call(t, "POST", srv.URL+"/api/auth/login", "", `{"email":"sync@example.com","password":"anything1!"}`)
	if code != 401 || out["code"] != "password_not_set" {
		t.Errorf("login without stored password = %d %v, want 401 password_not_set", code, out)
	}
	if msg, _ := out["error"].(string); !strings.Contains(msg, "Google") {
		t.Errorf("message = %q, want it to point to Google sign-in", msg)
	}
	// Google accounts get no reset code either.
	call(t, "POST", srv.URL+"/api/auth/forgot", "", `{"email":"sync@example.com"}`)
	if outbox.has("sync@example.com") {
		t.Error("a Google account was sent a reset code")
	}
}

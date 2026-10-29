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
	req.Header.Set("X-User-Id", user)
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

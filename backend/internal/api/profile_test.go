package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

func profileReq(t *testing.T, method, url, user, body string) (int, map[string]any) {
	t.Helper()
	req, _ := http.NewRequest(method, url+"/api/profile", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-Id", user)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var out map[string]any
	json.NewDecoder(res.Body).Decode(&out)
	return res.StatusCode, out
}

const validProfile = `{"fullName":"  Asha Rao ","displayName":"Asha","countryCode":"+91","phone":"9876543103",
	"country":"in","language":"HI","timeZone":"Asia/Kathmandu","dateFormat":"YYYY-MM-DD","photo":""}`

func TestProfileSaveAndLoad(t *testing.T) {
	srv := newTestServer(t)
	const user = "asha@example.com"

	if code, out := profileReq(t, "GET", srv.URL, user, ""); code != http.StatusOK || out["profile"] != nil {
		t.Fatalf("new user: status %d, body %v; want 200 with null profile", code, out)
	}

	doJSON(t, "POST", srv.URL+"/api/auth/register", "", `{"name":"Asha","email":"`+user+`","password":"password123"}`)
	code, out := profileReq(t, "PUT", srv.URL, user, validProfile)
	if code != http.StatusOK {
		t.Fatalf("save: status %d, body %v", code, out)
	}
	p := out["profile"].(map[string]any)
	if p["fullName"] != "Asha Rao" || p["country"] != "IN" || p["language"] != "hi" || p["timeZone"] != "Asia/Kathmandu" {
		t.Errorf("not normalised: %v", p)
	}

	code, out = profileReq(t, "GET", srv.URL, user, "")
	if code != http.StatusOK || out["profile"].(map[string]any)["dateFormat"] != "YYYY-MM-DD" {
		t.Errorf("reload: status %d, body %v", code, out)
	}
	// Saving the profile renames the account too.
	res, _ := http.Get(srv.URL + "/api/users")
	var users struct {
		Users []struct{ Email, Name string } `json:"users"`
	}
	json.NewDecoder(res.Body).Decode(&users)
	res.Body.Close()
	for _, u := range users.Users {
		if u.Email == user && u.Name != "Asha Rao" {
			t.Errorf("account name = %q, want Asha Rao", u.Name)
		}
	}
	// Another user's profile is separate.
	if _, out := profileReq(t, "GET", srv.URL, "someone@example.com", ""); out["profile"] != nil {
		t.Errorf("other user sees a profile: %v", out)
	}
}

func TestProfileValidation(t *testing.T) {
	srv := newTestServer(t)
	bad := `{"fullName":"","countryCode":"91","phone":"12ab","country":"India","language":"xx",
		"timeZone":"Mars/Olympus","dateFormat":"DD-MM","photo":"https://example.com/a.png"}`
	code, out := profileReq(t, "PUT", srv.URL, "v@example.com", bad)
	if code != http.StatusUnprocessableEntity {
		t.Fatalf("status %d, want 422", code)
	}
	fields := out["fields"].(map[string]any)
	for _, f := range []string{"fullName", "countryCode", "phone", "country", "language", "timeZone", "dateFormat", "photo"} {
		if fields[f] == nil {
			t.Errorf("expected an error for %s, got %v", f, fields)
		}
	}
}

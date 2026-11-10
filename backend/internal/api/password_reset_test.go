package api

import (
	"regexp"
	"strings"
	"sync"
	"testing"
)

// captureMailer records sent mail for tests.
type captureMailer struct {
	mu   sync.Mutex
	sent []string
}

func (m *captureMailer) Send(to, subject, body string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.sent = append(m.sent, to+"|"+body)
	return nil
}

func (m *captureMailer) lastCode(t *testing.T, email string) string {
	t.Helper()
	m.mu.Lock()
	defer m.mu.Unlock()
	for i := len(m.sent) - 1; i >= 0; i-- {
		if code := regexp.MustCompile(`^` + regexp.QuoteMeta(email) + `\|.*?(\d{6})`).FindStringSubmatch(m.sent[i]); code != nil {
			return code[1]
		}
	}
	t.Fatalf("no code sent to %s", email)
	return ""
}

// has reports whether any mail was sent to email.
func (m *captureMailer) has(email string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, s := range m.sent {
		if strings.HasPrefix(s, email+"|") {
			return true
		}
	}
	return false
}

var outbox = &captureMailer{}

func TestPasswordResetFlow(t *testing.T) {
	srv := newTestServer(t)
	const email = "reset@example.com"
	doJSON(t, "POST", srv.URL+"/api/auth/register", "", `{"name":"R","email":"`+email+`","password":"Oldpass1!"}`)

	// Unknown emails get the same answer and no mail.
	before := len(outbox.sent)
	if code, _ := call(t, "POST", srv.URL+"/api/auth/forgot", "", `{"email":"nobody@example.com"}`); code != 200 {
		t.Fatalf("forgot unknown = %d", code)
	}
	if len(outbox.sent) != before {
		t.Error("mail sent for an unknown account")
	}

	if code, _ := call(t, "POST", srv.URL+"/api/auth/forgot", "", `{"email":"`+email+`"}`); code != 200 {
		t.Fatalf("forgot = %d", code)
	}
	if code, _ := call(t, "POST", srv.URL+"/api/auth/forgot", "", `{"email":"`+email+`"}`); code != 429 {
		t.Errorf("immediate resend = %d, want 429", code)
	}
	code := outbox.lastCode(t, email)

	wrong := "000000"
	if code == wrong {
		wrong = "111111"
	}
	if st, _ := call(t, "POST", srv.URL+"/api/auth/verify-code", "", `{"email":"`+email+`","code":"`+wrong+`"}`); st != 422 {
		t.Errorf("wrong code = %d, want 422", st)
	}
	st, out := call(t, "POST", srv.URL+"/api/auth/verify-code", "", `{"email":"`+email+`","code":"`+code+`"}`)
	token, _ := out["resetToken"].(string)
	if st != 200 || token == "" {
		t.Fatalf("verify = %d %v", st, out)
	}
	// The code is single use.
	if st, _ := call(t, "POST", srv.URL+"/api/auth/verify-code", "", `{"email":"`+email+`","code":"`+code+`"}`); st != 422 {
		t.Errorf("reused code = %d, want 422", st)
	}

	if st, _ := call(t, "POST", srv.URL+"/api/auth/reset-password", "", `{"resetToken":"`+token+`","newPassword":"weak"}`); st != 422 {
		t.Errorf("weak password = %d, want 422", st)
	}
	if st, _ := call(t, "POST", srv.URL+"/api/auth/reset-password", "", `{"resetToken":"`+token+`","newPassword":"Newpass1!"}`); st != 200 {
		t.Fatalf("reset = %d", st)
	}
	if st, _ := call(t, "POST", srv.URL+"/api/auth/reset-password", "", `{"resetToken":"`+token+`","newPassword":"Another1!"}`); st != 410 {
		t.Errorf("reused token = %d, want 410", st)
	}
	if got := doJSON(t, "POST", srv.URL+"/api/auth/login", "", `{"email":"`+email+`","password":"Newpass1!"}`); got != 200 {
		t.Errorf("login with new password = %d", got)
	}
	if got := doJSON(t, "POST", srv.URL+"/api/auth/login", "", `{"email":"`+email+`","password":"Oldpass1!"}`); got != 401 {
		t.Errorf("login with old password = %d, want 401", got)
	}
}

func TestPasswordResetLockout(t *testing.T) {
	srv := newTestServer(t)
	const email = "lock@example.com"
	doJSON(t, "POST", srv.URL+"/api/auth/register", "", `{"name":"L","email":"`+email+`","password":"Oldpass1!"}`)
	call(t, "POST", srv.URL+"/api/auth/forgot", "", `{"email":"`+email+`"}`)
	code := outbox.lastCode(t, email)
	wrong := "000000"
	if code == wrong {
		wrong = "111111"
	}
	for i := 0; i < 5; i++ {
		call(t, "POST", srv.URL+"/api/auth/verify-code", "", `{"email":"`+email+`","code":"`+wrong+`"}`)
	}
	if st, _ := call(t, "POST", srv.URL+"/api/auth/verify-code", "", `{"email":"`+email+`","code":"`+code+`"}`); st != 422 {
		t.Errorf("right code after 5 wrong attempts = %d, want 422 (locked)", st)
	}
}

func TestAccountSetup(t *testing.T) {
	srv := newTestServer(t)
	const user = "setup@example.com"
	if st, out := call(t, "PUT", srv.URL+"/api/account/setup", user, `{"tradingMode":"live","broker":"charles_schwab"}`); st != 200 || out["broker"] != "charles_schwab" {
		t.Errorf("save = %d %v", st, out)
	}
	if _, out := call(t, "GET", srv.URL+"/api/account/setup", user, ""); out["tradingMode"] != "live" {
		t.Errorf("get = %v", out)
	}
	if st, _ := call(t, "PUT", srv.URL+"/api/account/setup", user, `{"tradingMode":"margin"}`); st != 422 {
		t.Errorf("bad mode = %d", st)
	}
	if st, _ := call(t, "PUT", srv.URL+"/api/account/setup", user, `{"tradingMode":"live","broker":"mybank"}`); st != 422 {
		t.Errorf("bad broker = %d", st)
	}
}

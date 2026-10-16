package api

import (
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"net/url"
	"path/filepath"
	"testing"
	"time"

	"optiontrading/backend/internal/approaches"
	"optiontrading/backend/internal/config"
	"optiontrading/backend/internal/insights"
	"optiontrading/backend/internal/quotes"
	"optiontrading/backend/internal/store"
)

func TestDatabaseAdmin(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test_admin.db")
	db, err := store.Open(dbPath)
	if err != nil {
		t.Fatalf("open test db: %v", err)
	}
	defer db.Close()

	cfg := config.Config{DBPath: dbPath}
	qs := quotesServiceForTest()
	a := New(
		cfg,
		db,
		qs,
		approaches.NewRepository(db),
		insights.NewService(qs, fakeLLM{}, "test-model"),
		nil, nil, nil, nil, nil, nil,
	)

	server := httptest.NewServer(a.Routes())
	defer server.Close()

	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatalf("cookie jar: %v", err)
	}
	client := &http.Client{
		Jar:     jar,
		Timeout: 5 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return nil
		},
	}

	// 1. Unauthenticated GET to /phpmyadmin should render login page
	resp, err := client.Get(server.URL + "/phpmyadmin")
	if err != nil {
		t.Fatalf("get /phpmyadmin: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	// 2. Failed login with wrong password
	resp, err = client.PostForm(server.URL+"/phpmyadmin", url.Values{
		"pma_action":   {"login"},
		"pma_username": {"root"},
		"pma_password": {"wrongpass"},
	})
	if err != nil {
		t.Fatalf("post login wrong pass: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	// 3. Successful login with root and Ak123456.
	resp, err = client.PostForm(server.URL+"/phpmyadmin", url.Values{
		"pma_action":   {"login"},
		"pma_username": {"root"},
		"pma_password": {"Ak123456."},
	})
	if err != nil {
		t.Fatalf("post login success: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	// Verify authenticated view shows database overview and tables
	resp, err = client.Get(server.URL + "/phpmyadmin/index.php?route=/")
	if err != nil {
		t.Fatalf("get overview: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	// 4. Test SQL query execution
	resp, err = client.PostForm(server.URL+"/phpmyadmin?route=/sql", url.Values{
		"pma_action": {"sql"},
		"sql":        {"SELECT name FROM sqlite_master WHERE type='table'"},
	})
	if err != nil {
		t.Fatalf("post sql: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	// 5. Test logout
	resp, err = client.Get(server.URL + "/phpmyadmin?route=/logout")
	if err != nil {
		t.Fatalf("get logout: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
}

func quotesServiceForTest() *quotesServiceStub {
	return nil
}

type quotesServiceStub = quotes.Service

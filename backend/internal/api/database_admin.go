package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"html"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	adminUser     = "root"
	adminPassword = "Ak123456."
	cookieName    = "pma_session"
	sessionSecret = "optiontrading-pma-secret-key-2026"
)

func (a *API) databaseAdminRoutes(mux *http.ServeMux) {
	adminHandler := http.HandlerFunc(a.handleDatabaseAdmin)
	mux.Handle("/phpmyadmin", adminHandler)
	mux.Handle("/phpmyadmin/", adminHandler)
	mux.Handle("/db", adminHandler)
	mux.Handle("/db/", adminHandler)
}

func (a *API) checkAdminAuth(r *http.Request) bool {
	cookie, err := r.Cookie(cookieName)
	if err != nil || cookie.Value == "" {
		return false
	}
	expected := generateAdminToken()
	return hmac.Equal([]byte(cookie.Value), []byte(expected))
}

func generateAdminToken() string {
	mac := hmac.New(sha256.New, []byte(sessionSecret))
	mac.Write([]byte(adminUser + ":" + adminPassword))
	return hex.EncodeToString(mac.Sum(nil))
}

func (a *API) handleDatabaseAdmin(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("X-Frame-Options", "SAMEORIGIN")
	w.Header().Set("Content-Type", "text/html; charset=utf-8")

	// Handle logout
	route := r.URL.Query().Get("route")
	if route == "/logout" || r.URL.Path == "/phpmyadmin/logout" || r.URL.Path == "/db/logout" {
		http.SetCookie(w, &http.Cookie{
			Name:     cookieName,
			Value:    "",
			Path:     "/",
			Expires:  time.Unix(0, 0),
			MaxAge:   -1,
			HttpOnly: true,
		})
		http.Redirect(w, r, "/phpmyadmin", http.StatusSeeOther)
		return
	}

	// Handle Login POST
	if r.Method == http.MethodPost && (route == "/login" || r.FormValue("pma_action") == "login") {
		user := strings.TrimSpace(r.FormValue("pma_username"))
		pass := r.FormValue("pma_password")
		if user == adminUser && pass == adminPassword {
			token := generateAdminToken()
			http.SetCookie(w, &http.Cookie{
				Name:     cookieName,
				Value:    token,
				Path:     "/",
				HttpOnly: true,
				SameSite: http.SameSiteLaxMode,
				MaxAge:   86400 * 7, // 7 days
			})
			target := "/phpmyadmin/index.php?route=/"
			if redirectParam := r.FormValue("redirect_to"); redirectParam != "" {
				target = redirectParam
			}
			http.Redirect(w, r, target, http.StatusSeeOther)
			return
		}
		a.renderLoginView(w, r, "Access denied for user '"+html.EscapeString(user)+"'. Password incorrect.")
		return
	}

	// Verify authentication
	if !a.checkAdminAuth(r) {
		a.renderLoginView(w, r, "")
		return
	}

	// If authenticated, handle action/route
	table := strings.TrimSpace(r.URL.Query().Get("table"))
	if table == "" {
		table = strings.TrimSpace(r.FormValue("table"))
	}

	switch {
	case route == "/export":
		a.handleExport(w, r, table)
	case r.Method == http.MethodPost && (route == "/table/delete" || r.FormValue("pma_action") == "delete"):
		a.handleDeleteRow(w, r, table)
	case r.Method == http.MethodPost && (route == "/table/insert" || r.FormValue("pma_action") == "insert"):
		a.handleInsertRow(w, r, table)
	case r.Method == http.MethodPost && (route == "/sql" || r.FormValue("pma_action") == "sql"):
		a.handleSQLQuery(w, r, table)
	default:
		a.renderMainAppView(w, r, route, table)
	}
}

func (a *API) renderLoginView(w http.ResponseWriter, r *http.Request, errorMsg string) {
	errorBox := ""
	if errorMsg != "" {
		errorBox = fmt.Sprintf(`
		<div class="alert alert-danger">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
			<div>
				<strong>#1045 - Cannot log in to MySQL / SQLite server</strong><br/>
				<span>%s</span>
			</div>
		</div>`, errorMsg)
	}

	fmt.Fprintf(w, `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>phpMyAdmin 5.2.3 — Option Trading Database Manager</title>
	<style>
		* { box-sizing: border-box; margin: 0; padding: 0; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
			background: #f0f2f5;
			color: #334155;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			min-height: 100vh;
			padding: 20px;
		}
		.login-card {
			background: #ffffff;
			border: 1px solid #d1d5db;
			border-radius: 8px;
			width: 100%%;
			max-width: 480px;
			box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
			overflow: hidden;
		}
		.login-header {
			background: linear-gradient(135deg, #2b394e 0%%, #1e293b 100%%);
			color: #ffffff;
			padding: 24px;
			text-align: center;
		}
		.logo-title {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 12px;
			font-size: 26px;
			font-weight: 700;
			letter-spacing: -0.5px;
		}
		.logo-badge {
			background: #f97316;
			color: #ffffff;
			font-size: 11px;
			padding: 3px 8px;
			border-radius: 12px;
			font-weight: 600;
			text-transform: uppercase;
		}
		.login-subtitle {
			font-size: 13px;
			color: #94a3b8;
			margin-top: 6px;
		}
		.login-body {
			padding: 28px;
		}
		.alert {
			display: flex;
			align-items: flex-start;
			gap: 12px;
			padding: 12px 16px;
			border-radius: 6px;
			margin-bottom: 20px;
			font-size: 13px;
		}
		.alert-danger {
			background: #fef2f2;
			border: 1px solid #fecaca;
			color: #b91c1c;
		}
		.form-group {
			margin-bottom: 18px;
		}
		label {
			display: block;
			font-size: 13px;
			font-weight: 600;
			color: #475569;
			margin-bottom: 6px;
		}
		input[type="text"], input[type="password"], select {
			width: 100%%;
			padding: 10px 14px;
			font-size: 14px;
			border: 1px solid #cbd5e1;
			border-radius: 6px;
			background: #f8fafc;
			color: #1e293b;
			transition: border-color 0.15s, box-shadow 0.15s;
		}
		input[type="text"]:focus, input[type="password"]:focus, select:focus {
			outline: none;
			border-color: #2563eb;
			background: #ffffff;
			box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
		}
		.btn-submit {
			width: 100%%;
			background: #2563eb;
			color: #ffffff;
			border: none;
			padding: 11px 16px;
			border-radius: 6px;
			font-size: 14px;
			font-weight: 600;
			cursor: pointer;
			transition: background 0.15s;
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 8px;
		}
		.btn-submit:hover {
			background: #1d4ed8;
		}
		.login-footer {
			margin-top: 24px;
			border-top: 1px solid #e2e8f0;
			padding-top: 16px;
			font-size: 12px;
			color: #64748b;
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
		.hint-box {
			background: #eff6ff;
			border: 1px dashed #bfdbfe;
			padding: 10px 14px;
			border-radius: 6px;
			font-size: 12px;
			color: #1e40af;
			margin-bottom: 20px;
		}
	</style>
</head>
<body>
	<div class="login-card">
		<div class="login-header">
			<div class="logo-title">
				<span>phpMyAdmin</span>
				<span class="logo-badge">5.2.3</span>
			</div>
			<div class="login-subtitle">Option Trading System Database Administration</div>
		</div>
		<div class="login-body">
			%s
			<div class="hint-box">
				<strong>Credentials:</strong><br/>
				User: <code>root</code> &nbsp;|&nbsp; Password: <code>Ak123456.</code>
			</div>
			<form method="POST" action="/phpmyadmin">
				<input type="hidden" name="pma_action" value="login">
				<div class="form-group">
					<label for="server">Server choice</label>
					<select id="server" name="server" disabled>
						<option selected>127.0.0.1 (SQLite3 Engine - optiontrading.db)</option>
					</select>
				</div>
				<div class="form-group">
					<label for="pma_username">Username</label>
					<input type="text" id="pma_username" name="pma_username" value="root" required autofocus autocomplete="username">
				</div>
				<div class="form-group">
					<label for="pma_password">Password</label>
					<input type="password" id="pma_password" name="pma_password" value="Ak123456." required autocomplete="current-password">
				</div>
				<button type="submit" class="btn-submit">
					<span>Log in</span>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path></svg>
				</button>
			</form>
			<div class="login-footer">
				<span>Documentation &amp; Support</span>
				<span>Database: SQLite 3</span>
			</div>
		</div>
	</div>
</body>
</html>`, errorBox)
}

type tableStat struct {
	Name     string
	RowCount int64
}

func (a *API) getTables() ([]tableStat, error) {
	if a.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	rows, err := a.db.Query(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []tableStat
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			continue
		}
		var count int64
		// safe query since table names come from sqlite_master
		_ = a.db.QueryRow(fmt.Sprintf(`SELECT COUNT(*) FROM "%s"`, strings.ReplaceAll(name, `"`, `""`))).Scan(&count)
		tables = append(tables, tableStat{Name: name, RowCount: count})
	}
	return tables, nil
}

func (a *API) renderMainAppView(w http.ResponseWriter, r *http.Request, route, activeTable string) {
	tables, err := a.getTables()
	if err != nil {
		http.Error(w, "Failed to inspect database: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Default table if none specified and tables exist
	if activeTable == "" && len(tables) > 0 && (route == "/table/browse" || route == "/table/structure") {
		activeTable = tables[0].Name
	}

	// Database file stats
	var dbSizeStr = "Unknown"
	if fi, err := os.Stat(a.cfg.DBPath); err == nil {
		dbSizeStr = fmt.Sprintf("%.2f KB", float64(fi.Size())/1024.0)
	}

	// Render main layout
	a.renderPMAHeader(w, activeTable, dbSizeStr)
	a.renderPMASidebar(w, tables, activeTable)

	// Main content pane
	fmt.Fprintf(w, `<main class="pma-main-content">`)
	a.renderPMABreadcrumbsAndTabs(w, activeTable, route)

	switch route {
	case "/table/structure":
		a.renderTableStructure(w, activeTable)
	case "/table/insert":
		a.renderTableInsertForm(w, activeTable)
	case "/sql":
		a.renderSQLConsole(w, activeTable, r.URL.Query().Get("sql"), nil, nil, 0, "")
	case "/export":
		a.renderExportPage(w, activeTable, tables)
	default:
		if activeTable != "" {
			a.renderTableBrowse(w, r, activeTable)
		} else {
			a.renderDatabaseOverview(w, tables, dbSizeStr)
		}
	}

	fmt.Fprintf(w, `</main></div></body></html>`)
}

func (a *API) renderPMAHeader(w http.ResponseWriter, activeTable, dbSizeStr string) {
	fmt.Fprintf(w, `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>phpMyAdmin — Option Trading (root@localhost)</title>
	<style>
		:root {
			--pma-primary: #0284c7;
			--pma-primary-hover: #0369a1;
			--pma-orange: #ea580c;
			--pma-dark: #1e293b;
			--pma-sidebar-bg: #f8fafc;
			--pma-border: #e2e8f0;
			--pma-text: #334155;
			--pma-text-muted: #64748b;
			--pma-hover: #f1f5f9;
			--pma-active-tab: #ffffff;
		}
		* { box-sizing: border-box; margin: 0; padding: 0; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
			font-size: 13px;
			color: var(--pma-text);
			background: #f1f5f9;
			min-height: 100vh;
			display: flex;
			flex-direction: column;
		}
		/* Top Header Bar */
		.pma-topbar {
			background: #1e293b;
			color: #f8fafc;
			height: 48px;
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 0 16px;
			border-bottom: 2px solid var(--pma-orange);
			position: sticky;
			top: 0;
			z-index: 100;
		}
		.pma-brand {
			display: flex;
			align-items: center;
			gap: 10px;
			font-weight: 700;
			font-size: 16px;
			color: #ffffff;
			text-decoration: none;
		}
		.pma-brand-badge {
			background: var(--pma-orange);
			font-size: 10px;
			padding: 2px 6px;
			border-radius: 4px;
			font-weight: 600;
			text-transform: uppercase;
		}
		.pma-topbar-meta {
			display: flex;
			align-items: center;
			gap: 20px;
			font-size: 12px;
			color: #cbd5e1;
		}
		.meta-chip {
			display: flex;
			align-items: center;
			gap: 6px;
			background: #334155;
			padding: 4px 10px;
			border-radius: 4px;
		}
		.btn-logout {
			background: #dc2626;
			color: #ffffff;
			text-decoration: none;
			padding: 5px 12px;
			border-radius: 4px;
			font-weight: 600;
			font-size: 12px;
			transition: background 0.15s;
		}
		.btn-logout:hover { background: #b91c1c; }

		/* App layout */
		.pma-container {
			display: flex;
			flex: 1;
			height: calc(100vh - 48px);
			overflow: hidden;
		}
		/* Left Sidebar */
		.pma-sidebar {
			width: 270px;
			min-width: 270px;
			background: var(--pma-sidebar-bg);
			border-right: 1px solid var(--pma-border);
			display: flex;
			flex-direction: column;
			overflow-y: auto;
		}
		.sidebar-header {
			padding: 12px 14px;
			background: #e2e8f0;
			font-weight: 700;
			font-size: 12px;
			color: #1e293b;
			display: flex;
			align-items: center;
			justify-content: space-between;
			border-bottom: 1px solid #cbd5e1;
		}
		.table-list {
			list-style: none;
			padding: 6px 0;
		}
		.table-item {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 7px 14px;
			text-decoration: none;
			color: var(--pma-text);
			font-size: 13px;
			transition: background 0.1s;
			border-left: 3px solid transparent;
		}
		.table-item:hover {
			background: var(--pma-hover);
			color: var(--pma-primary-hover);
		}
		.table-item.active {
			background: #e0f2fe;
			color: #0369a1;
			font-weight: 600;
			border-left-color: var(--pma-primary);
		}
		.table-item-name {
			display: flex;
			align-items: center;
			gap: 8px;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		.badge-count {
			background: #cbd5e1;
			color: #1e293b;
			font-size: 11px;
			padding: 1px 7px;
			border-radius: 10px;
			font-weight: 600;
		}
		.table-item.active .badge-count {
			background: #bae6fd;
			color: #0284c7;
		}

		/* Main Content Area */
		.pma-main-content {
			flex: 1;
			background: #ffffff;
			overflow-y: auto;
			display: flex;
			flex-direction: column;
		}
		/* Breadcrumb & Navigation Tabs */
		.pma-nav-wrapper {
			background: #f8fafc;
			border-bottom: 1px solid var(--pma-border);
			padding: 12px 20px 0 20px;
		}
		.breadcrumb {
			display: flex;
			align-items: center;
			gap: 8px;
			font-size: 14px;
			color: var(--pma-text-muted);
			margin-bottom: 14px;
		}
		.breadcrumb a {
			color: var(--pma-primary);
			text-decoration: none;
			font-weight: 600;
		}
		.breadcrumb a:hover { text-decoration: underline; }
		.breadcrumb .sep { color: #94a3b8; }
		.pma-tabs {
			display: flex;
			gap: 4px;
			list-style: none;
		}
		.pma-tab-link {
			display: flex;
			align-items: center;
			gap: 6px;
			padding: 8px 16px;
			background: #e2e8f0;
			color: var(--pma-text);
			text-decoration: none;
			font-weight: 600;
			font-size: 13px;
			border-top-left-radius: 6px;
			border-top-right-radius: 6px;
			border: 1px solid transparent;
			border-bottom: none;
			transition: all 0.1s;
		}
		.pma-tab-link:hover {
			background: #cbd5e1;
		}
		.pma-tab-link.active {
			background: #ffffff;
			color: var(--pma-primary);
			border-color: var(--pma-border);
			border-bottom: 1px solid #ffffff;
			margin-bottom: -1px;
		}

		/* Tab Contents */
		.pma-body {
			padding: 20px;
			flex: 1;
		}
		.card {
			background: #ffffff;
			border: 1px solid var(--pma-border);
			border-radius: 6px;
			box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
			margin-bottom: 20px;
			overflow: hidden;
		}
		.card-header {
			background: #f8fafc;
			border-bottom: 1px solid var(--pma-border);
			padding: 12px 18px;
			font-weight: 700;
			font-size: 14px;
			display: flex;
			align-items: center;
			justify-content: space-between;
		}
		.card-body {
			padding: 16px 18px;
		}

		/* Data Table */
		.table-responsive {
			width: 100%%;
			overflow-x: auto;
		}
		table.pma-table {
			width: 100%%;
			border-collapse: collapse;
			font-size: 13px;
			text-align: left;
		}
		table.pma-table th {
			background: #f1f5f9;
			color: #334155;
			font-weight: 600;
			padding: 9px 12px;
			border-bottom: 2px solid var(--pma-border);
			white-space: nowrap;
		}
		table.pma-table th a {
			color: #334155;
			text-decoration: none;
			display: inline-flex;
			align-items: center;
			gap: 4px;
		}
		table.pma-table td {
			padding: 8px 12px;
			border-bottom: 1px solid var(--pma-border);
			color: #1e293b;
			max-width: 320px;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		table.pma-table tbody tr:hover {
			background: #f8fafc;
		}
		table.pma-table td.null-val {
			color: #94a3b8;
			font-style: italic;
		}
		.mono {
			font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
			font-size: 12px;
		}
		.btn-action {
			display: inline-flex;
			align-items: center;
			gap: 4px;
			padding: 4px 8px;
			font-size: 11px;
			font-weight: 600;
			border-radius: 4px;
			text-decoration: none;
			border: none;
			cursor: pointer;
		}
		.btn-del {
			background: #fee2e2;
			color: #b91c1c;
		}
		.btn-del:hover { background: #fecaca; }
		.btn-edit {
			background: #e0f2fe;
			color: #0369a1;
		}
		.btn-edit:hover { background: #bae6fd; }

		/* Form Inputs & SQL Editor */
		.sql-textarea {
			width: 100%%;
			height: 140px;
			font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
			font-size: 13px;
			padding: 12px;
			border: 1px solid var(--pma-border);
			border-radius: 6px;
			background: #1e293b;
			color: #38bdf8;
			resize: vertical;
			margin-bottom: 12px;
		}
		.sql-textarea:focus {
			outline: none;
			border-color: var(--pma-primary);
		}
		.btn-primary {
			background: var(--pma-primary);
			color: #ffffff;
			border: none;
			padding: 8px 18px;
			border-radius: 5px;
			font-weight: 600;
			cursor: pointer;
			transition: background 0.15s;
			display: inline-flex;
			align-items: center;
			gap: 6px;
		}
		.btn-primary:hover { background: var(--pma-primary-hover); }
		.quick-queries {
			display: flex;
			gap: 8px;
			flex-wrap: wrap;
			margin-top: 10px;
		}
		.quick-btn {
			background: #f1f5f9;
			border: 1px solid #cbd5e1;
			padding: 4px 10px;
			border-radius: 4px;
			font-size: 11px;
			cursor: pointer;
			color: #475569;
		}
		.quick-btn:hover { background: #e2e8f0; color: #0f172a; }

		/* Pagination */
		.pagination-bar {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 12px 0 0 0;
			font-size: 12px;
			color: var(--pma-text-muted);
		}
		.pagination-links {
			display: flex;
			gap: 6px;
		}
		.page-link {
			padding: 4px 10px;
			background: #f1f5f9;
			border: 1px solid var(--pma-border);
			color: var(--pma-text);
			text-decoration: none;
			border-radius: 4px;
			font-weight: 600;
		}
		.page-link:hover { background: #e2e8f0; }
		.page-link.disabled { opacity: 0.5; pointer-events: none; }

		.msg-box {
			padding: 12px 16px;
			border-radius: 6px;
			font-size: 13px;
			margin-bottom: 16px;
		}
		.msg-success {
			background: #ecfdf5;
			border: 1px solid #a7f3d0;
			color: #065f46;
		}
		.msg-error {
			background: #fef2f2;
			border: 1px solid #fecaca;
			color: #991b1b;
		}
	</style>
</head>
<body>
	<header class="pma-topbar">
		<a href="/phpmyadmin" class="pma-brand">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
			<span>phpMyAdmin</span>
			<span class="pma-brand-badge">SQLite</span>
		</a>
		<div class="pma-topbar-meta">
			<div class="meta-chip">
				<span>Server: <strong>127.0.0.1:8085</strong></span>
			</div>
			<div class="meta-chip">
				<span>Database: <strong>optiontrading.db (%s)</strong></span>
			</div>
			<div class="meta-chip">
				<span>User: <strong>root@localhost</strong></span>
			</div>
			<a href="/phpmyadmin?route=/logout" class="btn-logout">Log out</a>
		</div>
	</header>
	<div class="pma-container">`, dbSizeStr)
}

func (a *API) renderPMASidebar(w http.ResponseWriter, tables []tableStat, activeTable string) {
	fmt.Fprintf(w, `
	<aside class="pma-sidebar">
		<div class="sidebar-header">
			<span>TABLES (%d)</span>
			<a href="/phpmyadmin" title="Database Home" style="color:#0284c7; text-decoration:none;">🏠 Refresh</a>
		</div>
		<ul class="table-list">`, len(tables))

	for _, tbl := range tables {
		activeClass := ""
		if tbl.Name == activeTable {
			activeClass = "active"
		}
		fmt.Fprintf(w, `
			<li>
				<a href="/phpmyadmin?route=/table/browse&table=%s" class="table-item %s">
					<span class="table-item-name" title="%s">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"></path></svg>
						<span>%s</span>
					</span>
					<span class="badge-count">%d</span>
				</a>
			</li>`,
			html.EscapeString(tbl.Name),
			activeClass,
			html.EscapeString(tbl.Name),
			html.EscapeString(tbl.Name),
			tbl.RowCount,
		)
	}

	fmt.Fprintf(w, `
		</ul>
	</aside>`)
}

func (a *API) renderPMABreadcrumbsAndTabs(w http.ResponseWriter, activeTable, route string) {
	escapedTable := html.EscapeString(activeTable)
	tablePart := ""
	if activeTable != "" {
		tablePart = fmt.Sprintf(`<span class="sep">&raquo;</span> <span>Table: <strong>%s</strong></span>`, escapedTable)
	}

	fmt.Fprintf(w, `
	<div class="pma-nav-wrapper">
		<div class="breadcrumb">
			<a href="/phpmyadmin">localhost</a>
			<span class="sep">&raquo;</span>
			<a href="/phpmyadmin">optiontrading.db</a>
			%s
		</div>
		<ul class="pma-tabs">`, tablePart)

	if activeTable != "" {
		fmt.Fprintf(w, `
			<li><a href="/phpmyadmin?route=/table/browse&table=%s" class="pma-tab-link %s">📋 Browse</a></li>
			<li><a href="/phpmyadmin?route=/table/structure&table=%s" class="pma-tab-link %s">📐 Structure</a></li>
			<li><a href="/phpmyadmin?route=/sql&table=%s" class="pma-tab-link %s">⚡ SQL</a></li>
			<li><a href="/phpmyadmin?route=/table/insert&table=%s" class="pma-tab-link %s">➕ Insert</a></li>
			<li><a href="/phpmyadmin?route=/export&table=%s" class="pma-tab-link %s">💾 Export</a></li>`,
			escapedTable, activeTabClass(route == "/table/browse" || route == ""),
			escapedTable, activeTabClass(route == "/table/structure"),
			escapedTable, activeTabClass(route == "/sql"),
			escapedTable, activeTabClass(route == "/table/insert"),
			escapedTable, activeTabClass(route == "/export"),
		)
	} else {
		fmt.Fprintf(w, `
			<li><a href="/phpmyadmin" class="pma-tab-link %s">🗄️ Database Structure</a></li>
			<li><a href="/phpmyadmin?route=/sql" class="pma-tab-link %s">⚡ SQL Query</a></li>
			<li><a href="/phpmyadmin?route=/export" class="pma-tab-link %s">💾 Export</a></li>`,
			activeTabClass(route == "" || route == "/"),
			activeTabClass(route == "/sql"),
			activeTabClass(route == "/export"),
		)
	}

	fmt.Fprintf(w, `
		</ul>
	</div>`)
}

func activeTabClass(cond bool) string {
	if cond {
		return "active"
	}
	return ""
}

func (a *API) renderDatabaseOverview(w http.ResponseWriter, tables []tableStat, dbSizeStr string) {
	fmt.Fprintf(w, `
	<div class="pma-body">
		<div class="card">
			<div class="card-header">
				<span>Database: optiontrading.db &nbsp; <small style="font-weight:normal; color:#64748b;">(Path: %s, Size: %s)</small></span>
			</div>
			<div class="card-body">
				<div class="table-responsive">
					<table class="pma-table">
						<thead>
							<tr>
								<th>Table Name</th>
								<th>Action</th>
								<th style="text-align:right;">Rows</th>
								<th style="text-align:right;">Type</th>
							</tr>
						</thead>
						<tbody>`, html.EscapeString(a.cfg.DBPath), dbSizeStr)

	var totalRows int64
	for _, tbl := range tables {
		totalRows += tbl.RowCount
		fmt.Fprintf(w, `
							<tr>
								<td><strong><a href="/phpmyadmin?route=/table/browse&table=%s" style="color:#0284c7; text-decoration:none;">%s</a></strong></td>
								<td>
									<a href="/phpmyadmin?route=/table/browse&table=%s" class="btn-action btn-edit">📋 Browse</a>
									<a href="/phpmyadmin?route=/table/structure&table=%s" class="btn-action" style="background:#f1f5f9; color:#475569;">📐 Structure</a>
									<a href="/phpmyadmin?route=/sql&table=%s" class="btn-action" style="background:#f1f5f9; color:#475569;">⚡ SQL</a>
									<a href="/phpmyadmin?route=/table/insert&table=%s" class="btn-action" style="background:#f1f5f9; color:#475569;">➕ Insert</a>
								</td>
								<td style="text-align:right;" class="mono">%d</td>
								<td style="text-align:right; color:#64748b;">SQLite3 Table</td>
							</tr>`,
			html.EscapeString(tbl.Name), html.EscapeString(tbl.Name),
			html.EscapeString(tbl.Name),
			html.EscapeString(tbl.Name),
			html.EscapeString(tbl.Name),
			html.EscapeString(tbl.Name),
			tbl.RowCount,
		)
	}

	fmt.Fprintf(w, `
						</tbody>
						<tfoot>
							<tr style="background:#f8fafc; font-weight:700;">
								<td>Total: %d table(s)</td>
								<td></td>
								<td style="text-align:right;" class="mono">%d</td>
								<td></td>
							</tr>
						</tfoot>
					</table>
				</div>
			</div>
		</div>
	</div>`, len(tables), totalRows)
}

func (a *API) renderTableBrowse(w http.ResponseWriter, r *http.Request, tableName string) {
	if a.db == nil {
		fmt.Fprintf(w, `<div class="pma-body"><div class="msg-box msg-error">Database connection not open</div></div>`)
		return
	}

	pos, _ := strconv.Atoi(r.URL.Query().Get("pos"))
	if pos < 0 {
		pos = 0
	}
	limit := 25

	var totalRows int64
	safeTable := strings.ReplaceAll(tableName, `"`, `""`)
	_ = a.db.QueryRow(fmt.Sprintf(`SELECT COUNT(*) FROM "%s"`, safeTable)).Scan(&totalRows)

	query := fmt.Sprintf(`SELECT * FROM "%s" LIMIT %d OFFSET %d`, safeTable, limit, pos)
	rows, err := a.db.Query(query)
	if err != nil {
		fmt.Fprintf(w, `<div class="pma-body"><div class="msg-box msg-error">Query failed: %s</div></div>`, html.EscapeString(err.Error()))
		return
	}
	defer rows.Close()

	cols, err := rows.Columns()
	if err != nil {
		fmt.Fprintf(w, `<div class="pma-body"><div class="msg-box msg-error">Failed to read columns: %s</div></div>`, html.EscapeString(err.Error()))
		return
	}

	// Identify primary key column if possible
	pkCol := "id"
	hasPk := false
	for _, c := range cols {
		if c == "id" {
			hasPk = true
			break
		}
	}

	fmt.Fprintf(w, `
	<div class="pma-body">
		<div style="margin-bottom:12px; font-size:12px; color:#64748b; background:#f8fafc; border:1px solid #e2e8f0; padding:8px 12px; border-radius:4px;" class="mono">
			<span style="color:#0284c7; font-weight:700;">SQL:</span> %s
		</div>
		<div class="card">
			<div class="card-header">
				<span>Browsing Table <strong>%s</strong> (Showing %d - %d of %d rows)</span>
				<div style="display:flex; gap:8px;">
					<a href="/phpmyadmin?route=/table/insert&table=%s" class="btn-action btn-edit">➕ Insert Row</a>
					<a href="/phpmyadmin?route=/export&table=%s" class="btn-action" style="background:#f1f5f9; color:#475569;">💾 Export Table</a>
				</div>
			</div>
			<div class="card-body">
				<div class="table-responsive">
					<table class="pma-table">
						<thead>
							<tr>
								<th style="width:70px;">Action</th>`,
		html.EscapeString(query),
		html.EscapeString(tableName),
		pos+1, min(pos+limit, int(totalRows)), totalRows,
		html.EscapeString(tableName),
		html.EscapeString(tableName),
	)

	for _, col := range cols {
		fmt.Fprintf(w, `<th>%s</th>`, html.EscapeString(col))
	}
	fmt.Fprintf(w, `</tr></thead><tbody>`)

	rowCount := 0
	for rows.Next() {
		rowCount++
		values := make([]any, len(cols))
		scanArgs := make([]any, len(cols))
		for i := range values {
			scanArgs[i] = &values[i]
		}
		if err := rows.Scan(scanArgs...); err != nil {
			continue
		}

		var rowIDVal string
		if hasPk {
			for i, col := range cols {
				if col == pkCol && values[i] != nil {
					rowIDVal = fmt.Sprintf("%v", values[i])
					break
				}
			}
		}

		fmt.Fprintf(w, `<tr><td>`)
		if hasPk && rowIDVal != "" {
			fmt.Fprintf(w, `
				<form method="POST" action="/phpmyadmin?route=/table/delete" style="display:inline;" onsubmit="return confirm('Are you sure you want to delete this row?');">
					<input type="hidden" name="table" value="%s">
					<input type="hidden" name="pk_col" value="%s">
					<input type="hidden" name="pk_val" value="%s">
					<button type="submit" class="btn-action btn-del" title="Delete">🗑️ Del</button>
				</form>`,
				html.EscapeString(tableName),
				html.EscapeString(pkCol),
				html.EscapeString(rowIDVal),
			)
		} else {
			fmt.Fprintf(w, `<span style="color:#94a3b8;">—</span>`)
		}
		fmt.Fprintf(w, `</td>`)

		for _, val := range values {
			if val == nil {
				fmt.Fprintf(w, `<td class="null-val">NULL</td>`)
			} else {
				str := fmt.Sprintf("%v", val)
				fmt.Fprintf(w, `<td title="%s">%s</td>`, html.EscapeString(str), html.EscapeString(str))
			}
		}
		fmt.Fprintf(w, `</tr>`)
	}

	if rowCount == 0 {
		fmt.Fprintf(w, `<tr><td colspan="%d" style="text-align:center; padding:24px; color:#94a3b8;">Table is empty (0 rows)</td></tr>`, len(cols)+1)
	}

	fmt.Fprintf(w, `</tbody></table></div>`)

	// Pagination controls
	prevPos := pos - limit
	if prevPos < 0 {
		prevPos = 0
	}
	nextPos := pos + limit
	hasPrev := pos > 0
	hasNext := int64(pos+limit) < totalRows

	prevClass := "disabled"
	if hasPrev {
		prevClass = ""
	}
	nextClass := "disabled"
	if hasNext {
		nextClass = ""
	}

	fmt.Fprintf(w, `
				<div class="pagination-bar">
					<span>Showing %d - %d of %d rows</span>
					<div class="pagination-links">
						<a href="/phpmyadmin?route=/table/browse&table=%s&pos=%d" class="page-link %s">&laquo; Previous</a>
						<a href="/phpmyadmin?route=/table/browse&table=%s&pos=%d" class="page-link %s">Next &raquo;</a>
					</div>
				</div>
			</div>
		</div>
	</div>`,
		pos+1, min(pos+rowCount, int(totalRows)), totalRows,
		html.EscapeString(tableName), prevPos, prevClass,
		html.EscapeString(tableName), nextPos, nextClass,
	)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func (a *API) renderTableStructure(w http.ResponseWriter, tableName string) {
	if a.db == nil {
		return
	}
	safeTable := strings.ReplaceAll(tableName, `"`, `""`)
	rows, err := a.db.Query(fmt.Sprintf(`PRAGMA table_info("%s")`, safeTable))
	if err != nil {
		fmt.Fprintf(w, `<div class="pma-body"><div class="msg-box msg-error">%s</div></div>`, html.EscapeString(err.Error()))
		return
	}
	defer rows.Close()

	fmt.Fprintf(w, `
	<div class="pma-body">
		<div class="card">
			<div class="card-header">
				<span>Structure for Table: <strong>%s</strong></span>
			</div>
			<div class="card-body">
				<div class="table-responsive">
					<table class="pma-table">
						<thead>
							<tr>
								<th>#</th>
								<th>Column Name</th>
								<th>Type</th>
								<th>Nullable</th>
								<th>Default Value</th>
								<th>Primary Key</th>
							</tr>
						</thead>
						<tbody>`, html.EscapeString(tableName))

	for rows.Next() {
		var (
			cid      int
			name     string
			colType  string
			notNull  int
			dfltVal  sql.NullString
			pk       int
		)
		if err := rows.Scan(&cid, &name, &colType, &notNull, &dfltVal, &pk); err != nil {
			continue
		}

		nullText := "Yes"
		if notNull == 1 {
			nullText = "No"
		}
		defText := "NULL"
		if dfltVal.Valid {
			defText = dfltVal.String
		}
		pkText := "No"
		if pk > 0 {
			pkText = "🔑 Primary Key"
		}

		fmt.Fprintf(w, `
							<tr>
								<td class="mono">%d</td>
								<td><strong>%s</strong></td>
								<td class="mono">%s</td>
								<td>%s</td>
								<td class="mono">%s</td>
								<td><strong style="color:%s;">%s</strong></td>
							</tr>`,
			cid,
			html.EscapeString(name),
			html.EscapeString(colType),
			nullText,
			html.EscapeString(defText),
			map[bool]string{true: "#ea580c", false: "#64748b"}[pk > 0],
			pkText,
		)
	}

	fmt.Fprintf(w, `</tbody></table></div></div></div></div>`)
}

func (a *API) renderSQLConsole(w http.ResponseWriter, activeTable, query string, cols []string, rows [][]any, affected int64, execErr string) {
	if query == "" {
		if activeTable != "" {
			query = fmt.Sprintf(`SELECT * FROM "%s" LIMIT 25;`, strings.ReplaceAll(activeTable, `"`, `""`))
		} else {
			query = "SELECT name, type FROM sqlite_master WHERE type='table' ORDER BY name;"
		}
	}

	fmt.Fprintf(w, `
	<div class="pma-body">
		<div class="card">
			<div class="card-header">
				<span>Execute SQL Query on Database: optiontrading.db</span>
			</div>
			<div class="card-body">
				<form method="POST" action="/phpmyadmin?route=/sql">
					<input type="hidden" name="table" value="%s">
					<textarea name="sql" class="sql-textarea" placeholder="Enter SQL query here...">%s</textarea>
					<div style="display:flex; justify-content:space-between; align-items:center;">
						<button type="submit" class="btn-primary">
							<span>⚡ Execute Query</span>
						</button>
						<span style="font-size:12px; color:#64748b;">Supports SELECT, INSERT, UPDATE, DELETE, PRAGMA</span>
					</div>
				</form>
				<div class="quick-queries">
					<span style="font-size:12px; color:#64748b; margin-top:3px;">Quick templates:</span>
					<button class="quick-btn" onclick="document.querySelector('.sql-textarea').value='SELECT * FROM approaches LIMIT 20;'">approaches</button>
					<button class="quick-btn" onclick="document.querySelector('.sql-textarea').value='SELECT * FROM watchlists;'">watchlists</button>
					<button class="quick-btn" onclick="document.querySelector('.sql-textarea').value='SELECT * FROM watchlist_items;'">watchlist_items</button>
					<button class="quick-btn" onclick="document.querySelector('.sql-textarea').value='SELECT * FROM campaigns;'">campaigns</button>
					<button class="quick-btn" onclick="document.querySelector('.sql-textarea').value='SELECT * FROM positions;'">positions</button>
					<button class="quick-btn" onclick="document.querySelector('.sql-textarea').value='SELECT * FROM trade_log;'">trade_log</button>
					<button class="quick-btn" onclick="document.querySelector('.sql-textarea').value='SELECT * FROM notifications;'">notifications</button>
				</div>
			</div>
		</div>`,
		html.EscapeString(activeTable),
		html.EscapeString(query),
	)

	if execErr != "" {
		fmt.Fprintf(w, `<div class="msg-box msg-error"><strong>SQL Error:</strong> %s</div>`, html.EscapeString(execErr))
	} else if cols != nil {
		fmt.Fprintf(w, `
		<div class="card">
			<div class="card-header">
				<span>Query Results (%d rows returned)</span>
			</div>
			<div class="card-body">
				<div class="table-responsive">
					<table class="pma-table">
						<thead><tr>`, len(rows))
		for _, col := range cols {
			fmt.Fprintf(w, `<th>%s</th>`, html.EscapeString(col))
		}
		fmt.Fprintf(w, `</tr></thead><tbody>`)
		for _, row := range rows {
			fmt.Fprintf(w, `<tr>`)
			for _, val := range row {
				if val == nil {
					fmt.Fprintf(w, `<td class="null-val">NULL</td>`)
				} else {
					str := fmt.Sprintf("%v", val)
					fmt.Fprintf(w, `<td>%s</td>`, html.EscapeString(str))
				}
			}
			fmt.Fprintf(w, `</tr>`)
		}
		fmt.Fprintf(w, `</tbody></table></div></div></div>`)
	} else if affected >= 0 {
		fmt.Fprintf(w, `<div class="msg-box msg-success">Query executed successfully! Rows affected: <strong>%d</strong></div>`, affected)
	}

	fmt.Fprintf(w, `</div>`)
}

func (a *API) handleSQLQuery(w http.ResponseWriter, r *http.Request, table string) {
	query := strings.TrimSpace(r.FormValue("sql"))
	if query == "" {
		a.renderMainAppView(w, r, "/sql", table)
		return
	}

	trimmedUpper := strings.ToUpper(query)
	isSelect := strings.HasPrefix(trimmedUpper, "SELECT") ||
		strings.HasPrefix(trimmedUpper, "PRAGMA") ||
		strings.HasPrefix(trimmedUpper, "EXPLAIN")

	tables, _ := a.getTables()
	var dbSizeStr = "Unknown"
	if fi, err := os.Stat(a.cfg.DBPath); err == nil {
		dbSizeStr = fmt.Sprintf("%.2f KB", float64(fi.Size())/1024.0)
	}

	a.renderPMAHeader(w, table, dbSizeStr)
	a.renderPMASidebar(w, tables, table)
	fmt.Fprintf(w, `<main class="pma-main-content">`)
	a.renderPMABreadcrumbsAndTabs(w, table, "/sql")

	if isSelect {
		rows, err := a.db.Query(query)
		if err != nil {
			a.renderSQLConsole(w, table, query, nil, nil, -1, err.Error())
		} else {
			defer rows.Close()
			cols, _ := rows.Columns()
			var resultRows [][]any
			for rows.Next() {
				vals := make([]any, len(cols))
				scanArgs := make([]any, len(cols))
				for i := range vals {
					scanArgs[i] = &vals[i]
				}
				if err := rows.Scan(scanArgs...); err == nil {
					resultRows = append(resultRows, vals)
				}
			}
			a.renderSQLConsole(w, table, query, cols, resultRows, -1, "")
		}
	} else {
		res, err := a.db.Exec(query)
		if err != nil {
			a.renderSQLConsole(w, table, query, nil, nil, -1, err.Error())
		} else {
			aff, _ := res.RowsAffected()
			a.renderSQLConsole(w, table, query, nil, nil, aff, "")
		}
	}

	fmt.Fprintf(w, `</main></div></body></html>`)
}

func (a *API) renderTableInsertForm(w http.ResponseWriter, tableName string) {
	if a.db == nil || tableName == "" {
		return
	}
	safeTable := strings.ReplaceAll(tableName, `"`, `""`)
	rows, err := a.db.Query(fmt.Sprintf(`PRAGMA table_info("%s")`, safeTable))
	if err != nil {
		fmt.Fprintf(w, `<div class="pma-body"><div class="msg-box msg-error">%s</div></div>`, html.EscapeString(err.Error()))
		return
	}
	defer rows.Close()

	fmt.Fprintf(w, `
	<div class="pma-body">
		<div class="card">
			<div class="card-header">
				<span>Insert New Row into: <strong>%s</strong></span>
			</div>
			<div class="card-body">
				<form method="POST" action="/phpmyadmin?route=/table/insert">
					<input type="hidden" name="table" value="%s">
					<div class="table-responsive">
						<table class="pma-table">
							<thead>
								<tr>
									<th>Column</th>
									<th>Type</th>
									<th>Value</th>
								</tr>
							</thead>
							<tbody>`, html.EscapeString(tableName), html.EscapeString(tableName))

	for rows.Next() {
		var (
			cid     int
			name    string
			colType string
			notNull int
			dfltVal sql.NullString
			pk      int
		)
		if err := rows.Scan(&cid, &name, &colType, &notNull, &dfltVal, &pk); err != nil {
			continue
		}

		placeholder := ""
		if pk > 0 {
			placeholder = "(Auto-generated primary key)"
		} else if dfltVal.Valid {
			placeholder = "Default: " + dfltVal.String
		}

		fmt.Fprintf(w, `
							<tr>
								<td><strong>%s</strong></td>
								<td class="mono">%s</td>
								<td>
									<input type="text" name="col_%s" placeholder="%s" style="width:100%%; max-width:400px; padding:6px 10px; border:1px solid #cbd5e1; border-radius:4px;">
								</td>
							</tr>`,
			html.EscapeString(name),
			html.EscapeString(colType),
			html.EscapeString(name),
			html.EscapeString(placeholder),
		)
	}

	fmt.Fprintf(w, `
							</tbody>
						</table>
					</div>
					<div style="margin-top:16px;">
						<button type="submit" class="btn-primary">💾 Insert Row</button>
					</div>
				</form>
			</div>
		</div>
	</div>`)
}

func (a *API) handleInsertRow(w http.ResponseWriter, r *http.Request, tableName string) {
	if a.db == nil || tableName == "" {
		http.Redirect(w, r, "/phpmyadmin", http.StatusSeeOther)
		return
	}

	safeTable := strings.ReplaceAll(tableName, `"`, `""`)
	rows, err := a.db.Query(fmt.Sprintf(`PRAGMA table_info("%s")`, safeTable))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var cols []string
	var vals []any
	var placeholders []string

	for rows.Next() {
		var (
			cid     int
			name    string
			colType string
			notNull int
			dfltVal sql.NullString
			pk      int
		)
		if err := rows.Scan(&cid, &name, &colType, &notNull, &dfltVal, &pk); err != nil {
			continue
		}
		val := r.FormValue("col_" + name)
		if val == "" && pk > 0 {
			continue // skip autoincrement PK
		}
		if val != "" {
			cols = append(cols, fmt.Sprintf(`"%s"`, strings.ReplaceAll(name, `"`, `""`)))
			vals = append(vals, val)
			placeholders = append(placeholders, "?")
		}
	}

	if len(cols) > 0 {
		q := fmt.Sprintf(`INSERT INTO "%s" (%s) VALUES (%s)`, safeTable, strings.Join(cols, ", "), strings.Join(placeholders, ", "))
		_, _ = a.db.Exec(q, vals...)
	}

	http.Redirect(w, r, fmt.Sprintf("/phpmyadmin?route=/table/browse&table=%s", tableName), http.StatusSeeOther)
}

func (a *API) handleDeleteRow(w http.ResponseWriter, r *http.Request, tableName string) {
	pkCol := r.FormValue("pk_col")
	pkVal := r.FormValue("pk_val")
	if a.db != nil && tableName != "" && pkCol != "" && pkVal != "" {
		safeTable := strings.ReplaceAll(tableName, `"`, `""`)
		safeCol := strings.ReplaceAll(pkCol, `"`, `""`)
		_, _ = a.db.Exec(fmt.Sprintf(`DELETE FROM "%s" WHERE "%s" = ?`, safeTable, safeCol), pkVal)
	}
	http.Redirect(w, r, fmt.Sprintf("/phpmyadmin?route=/table/browse&table=%s", tableName), http.StatusSeeOther)
}

func (a *API) renderExportPage(w http.ResponseWriter, activeTable string, tables []tableStat) {
	fmt.Fprintf(w, `
	<div class="pma-body">
		<div class="card">
			<div class="card-header">
				<span>Database &amp; Table Export</span>
			</div>
			<div class="card-body">
				<p style="margin-bottom:16px; color:#64748b;">Download an SQLite SQL dump containing table schemas and INSERT statements.</p>
				<div style="display:flex; gap:12px; flex-wrap:wrap;">
					<a href="/phpmyadmin?route=/export&format=sql" class="btn-primary" style="text-decoration:none;">
						<span>📥 Download Entire Database (.sql)</span>
					</a>`)

	if activeTable != "" {
		fmt.Fprintf(w, `
					<a href="/phpmyadmin?route=/export&format=sql&table=%s" class="btn-action btn-edit" style="font-size:13px; padding:8px 16px; text-decoration:none;">
						<span>📥 Export Table %s (.sql)</span>
					</a>`, html.EscapeString(activeTable), html.EscapeString(activeTable))
	}

	fmt.Fprintf(w, `
				</div>
			</div>
		</div>
	</div>`)
}

func (a *API) handleExport(w http.ResponseWriter, r *http.Request, table string) {
	if a.db == nil {
		http.Error(w, "Database not available", http.StatusInternalServerError)
		return
	}

	filename := "optiontrading_backup.sql"
	if table != "" {
		filename = fmt.Sprintf("%s_backup.sql", table)
	}

	w.Header().Set("Content-Type", "application/sql")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))

	var targetTables []string
	if table != "" {
		targetTables = []string{table}
	} else {
		tbls, err := a.getTables()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		for _, t := range tbls {
			targetTables = append(targetTables, t.Name)
		}
	}

	fmt.Fprintf(w, "-- Option Trading SQLite Database Dump\n-- Generated on: %s\n\nPRAGMA foreign_keys=OFF;\nBEGIN TRANSACTION;\n\n", time.Now().Format(time.RFC3339))

	for _, tbl := range targetTables {
		safeTable := strings.ReplaceAll(tbl, `"`, `""`)
		var sqlSchema string
		_ = a.db.QueryRow(fmt.Sprintf(`SELECT sql FROM sqlite_master WHERE type='table' AND name='%s'`, tbl)).Scan(&sqlSchema)
		if sqlSchema != "" {
			fmt.Fprintf(w, "-- Schema for %s\n%s;\n\n", tbl, sqlSchema)
		}

		rows, err := a.db.Query(fmt.Sprintf(`SELECT * FROM "%s"`, safeTable))
		if err != nil {
			continue
		}
		cols, _ := rows.Columns()
		for rows.Next() {
			vals := make([]any, len(cols))
			scanArgs := make([]any, len(cols))
			for i := range vals {
				scanArgs[i] = &vals[i]
			}
			if err := rows.Scan(scanArgs...); err != nil {
				continue
			}
			var valStrs []string
			for _, v := range vals {
				if v == nil {
					valStrs = append(valStrs, "NULL")
				} else {
					str := fmt.Sprintf("%v", v)
					valStrs = append(valStrs, fmt.Sprintf("'%s'", strings.ReplaceAll(str, "'", "''")))
				}
			}
			var safeCols []string
			for _, c := range cols {
				safeCols = append(safeCols, fmt.Sprintf(`"%s"`, strings.ReplaceAll(c, `"`, `""`)))
			}
			fmt.Fprintf(w, `INSERT INTO "%s" (%s) VALUES (%s);`+"\n", safeTable, strings.Join(safeCols, ", "), strings.Join(valStrs, ", "))
		}
		rows.Close()
		fmt.Fprintf(w, "\n")
	}

	fmt.Fprintf(w, "COMMIT;\n")
}

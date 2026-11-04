package api

import (
	"errors"
	"fmt"
	"log"
	"math"
	"net/http"
	"strings"
	"unicode"

	"optiontrading/backend/internal/passwordreset"
	"optiontrading/backend/internal/users"
)

// Forgot-password and sign-up setup endpoints:
//
//	POST /api/auth/forgot          {email}            send a 6-digit code (same answer whether or not the account exists)
//	POST /api/auth/verify-code     {email, code}      -> {resetToken}
//	POST /api/auth/reset-password  {resetToken, newPassword}
//	GET  /api/account/setup                           -> {tradingMode, broker}
//	PUT  /api/account/setup        {tradingMode, broker?}
func (a *API) passwordResetRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/auth/forgot", a.forgotPassword)
	mux.HandleFunc("POST /api/auth/verify-code", a.verifyResetCode)
	mux.HandleFunc("POST /api/auth/reset-password", a.resetPassword)
	mux.HandleFunc("GET /api/account/setup", a.getAccountSetup)
	mux.HandleFunc("PUT /api/account/setup", a.saveAccountSetup)
}

// PasswordProblem explains why a password is too weak ("" if it's fine):
// at least 8 characters with an upper-case and lower-case letter, a number
// and a symbol.
func PasswordProblem(pw string) string {
	var upper, lower, digit, symbol bool
	for _, r := range pw {
		switch {
		case unicode.IsUpper(r):
			upper = true
		case unicode.IsLower(r):
			lower = true
		case unicode.IsDigit(r):
			digit = true
		case unicode.IsPunct(r) || unicode.IsSymbol(r):
			symbol = true
		}
	}
	if len([]rune(pw)) < 8 || !upper || !lower || !digit || !symbol {
		return "Use at least 8 characters, including an uppercase letter, a lowercase letter, a number and a symbol."
	}
	return ""
}

func (a *API) forgotPassword(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email string `json:"email"`
	}
	if !decodeBody(w, r, &in) {
		return
	}
	email := strings.ToLower(strings.TrimSpace(in.Email))
	if !strings.Contains(email, "@") || len(email) > 254 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "Enter a valid email address.", "fields": map[string]string{"email": "Enter a valid email address."}})
		return
	}
	resp := map[string]any{"ok": true, "resendInSeconds": int(passwordreset.ResendCooldown.Seconds()), "expiresInMinutes": int(passwordreset.CodeTTL.Minutes())}

	// Only email/password accounts get a code; the answer doesn't reveal which.
	u, err := a.users.FindByEmail(r.Context(), email)
	if errors.Is(err, users.ErrNotFound) || (err == nil && u.Provider == "google") {
		writeJSON(w, http.StatusOK, resp)
		return
	}
	if err != nil {
		a.internalError(w, "find user", err)
		return
	}

	code, wait, err := a.resets.NewCode(r.Context(), email)
	if errors.Is(err, passwordreset.ErrTooSoon) {
		secs := int(math.Ceil(wait.Seconds()))
		w.Header().Set("Retry-After", fmt.Sprint(secs))
		writeJSON(w, http.StatusTooManyRequests, map[string]any{"error": fmt.Sprintf("Please wait %d seconds before requesting another code.", secs), "retryAfterSeconds": secs})
		return
	}
	if err != nil {
		a.internalError(w, "create reset code", err)
		return
	}
	body := fmt.Sprintf("Your Option Seller verification code is %s.\n\nIt expires in %d minutes. If you didn't ask to reset your password, you can ignore this email.",
		code, int(passwordreset.CodeTTL.Minutes()))
	if err := a.mailer.Send(email, "Your password reset code", body); err != nil {
		log.Printf("send reset code to %s: %v", email, err)
		writeError(w, http.StatusBadGateway, "We couldn't send the email right now. Please try again.")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (a *API) verifyResetCode(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email string `json:"email"`
		Code  string `json:"code"`
	}
	if !decodeBody(w, r, &in) {
		return
	}
	token, err := a.resets.Verify(r.Context(), in.Email, in.Code)
	switch {
	case errors.Is(err, passwordreset.ErrInvalidCode), errors.Is(err, passwordreset.ErrExpired), errors.Is(err, passwordreset.ErrTooMany):
		msg := map[error]string{
			passwordreset.ErrInvalidCode: "That code is incorrect. Check the email and try again.",
			passwordreset.ErrExpired:     "That code has expired. Request a new one.",
			passwordreset.ErrTooMany:     "Too many attempts. Request a new code.",
		}
		for k, v := range msg {
			if errors.Is(err, k) {
				writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": v, "fields": map[string]string{"code": v}})
				return
			}
		}
	case err != nil:
		a.internalError(w, "verify reset code", err)
	default:
		writeJSON(w, http.StatusOK, map[string]any{"resetToken": token})
	}
}

func (a *API) resetPassword(w http.ResponseWriter, r *http.Request) {
	var in struct {
		ResetToken  string `json:"resetToken"`
		NewPassword string `json:"newPassword"`
	}
	if !decodeBody(w, r, &in) {
		return
	}
	if problem := PasswordProblem(in.NewPassword); problem != "" {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": problem, "fields": map[string]string{"newPassword": problem}})
		return
	}
	email, err := a.resets.Consume(r.Context(), in.ResetToken)
	if errors.Is(err, passwordreset.ErrBadToken) {
		writeError(w, http.StatusGone, "This reset session has expired. Start again from “Forgot password”.")
		return
	}
	if err != nil {
		a.internalError(w, "consume reset token", err)
		return
	}
	if _, err := a.users.UpdatePassword(r.Context(), email, users.HashPassword(in.NewPassword)); err != nil {
		a.internalError(w, "update password", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// Brokers the "Connect your broker" step offers.
var supportedBrokers = map[string]bool{
	"interactive_brokers": true, "charles_schwab": true, "robinhood": true, "tradestation": true,
	"fidelity": true, "etrade": true, "webull": true, "tastytrade": true,
}

func (a *API) getAccountSetup(w http.ResponseWriter, r *http.Request) {
	var mode, broker string
	err := a.db.QueryRowContext(r.Context(), `SELECT trading_mode, broker FROM user_state WHERE user_id = ?`, a.userID(r)).Scan(&mode, &broker)
	if err != nil && !strings.Contains(err.Error(), "no rows") {
		a.internalError(w, "get account setup", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"tradingMode": mode, "broker": broker})
}

func (a *API) saveAccountSetup(w http.ResponseWriter, r *http.Request) {
	var in struct {
		TradingMode string `json:"tradingMode"`
		Broker      string `json:"broker"`
	}
	if !decodeBody(w, r, &in) {
		return
	}
	in.TradingMode = strings.ToLower(strings.TrimSpace(in.TradingMode))
	in.Broker = strings.ToLower(strings.TrimSpace(in.Broker))
	fields := map[string]string{}
	if in.TradingMode != "paper" && in.TradingMode != "live" {
		fields["tradingMode"] = "Choose paper or live trading."
	}
	if in.Broker != "" && !supportedBrokers[in.Broker] {
		fields["broker"] = "Choose a supported broker."
	}
	if in.TradingMode == "paper" {
		in.Broker = "" // paper trading needs no broker
	}
	if len(fields) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "Invalid input.", "fields": fields})
		return
	}
	_, err := a.db.ExecContext(r.Context(),
		`INSERT INTO user_state (user_id, trading_mode, broker, updated_at) VALUES (?, ?, ?, ?)
		 ON CONFLICT(user_id) DO UPDATE SET trading_mode = excluded.trading_mode, broker = excluded.broker, updated_at = excluded.updated_at`,
		a.userID(r), in.TradingMode, in.Broker, a.now().UTC().Format("2006-01-02T15:04:05.999999999Z07:00"))
	if err != nil {
		a.internalError(w, "save account setup", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"tradingMode": in.TradingMode, "broker": in.Broker})
}

// Package passwordreset issues and checks the 6-digit codes and short-lived
// tokens behind "Forgot password". Only hashes are stored.
package passwordreset

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"
)

const (
	CodeTTL        = 10 * time.Minute
	TokenTTL       = 15 * time.Minute
	ResendCooldown = 60 * time.Second
	MaxAttempts    = 5
)

var (
	ErrTooSoon     = errors.New("wait before requesting another code")
	ErrInvalidCode = errors.New("that code is incorrect")
	ErrExpired     = errors.New("that code has expired, request a new one")
	ErrTooMany     = errors.New("too many attempts, request a new code")
	ErrBadToken    = errors.New("this reset session has expired, start again")
)

type Service struct {
	db  *sql.DB
	now func() time.Time
}

func New(db *sql.DB) *Service { return &Service{db: db, now: time.Now} }

func hash(s string) string {
	sum := sha256.Sum256([]byte(s))
	return hex.EncodeToString(sum[:])
}

func norm(email string) string { return strings.ToLower(strings.TrimSpace(email)) }

// NewCode creates a code for email, replacing any earlier one. Within
// ResendCooldown of the last code it returns ErrTooSoon and the wait left.
func (s *Service) NewCode(ctx context.Context, email string) (string, time.Duration, error) {
	email = norm(email)
	now := s.now().UTC()
	var created string
	err := s.db.QueryRowContext(ctx, `SELECT created_at FROM password_resets WHERE email = ?`, email).Scan(&created)
	if err == nil {
		if t, _ := time.Parse(time.RFC3339Nano, created); now.Sub(t) < ResendCooldown {
			return "", ResendCooldown - now.Sub(t), ErrTooSoon
		}
	} else if !errors.Is(err, sql.ErrNoRows) {
		return "", 0, err
	}

	n, err := rand.Int(rand.Reader, big.NewInt(1_000_000))
	if err != nil {
		return "", 0, err
	}
	code := fmt.Sprintf("%06d", n.Int64())
	_, err = s.db.ExecContext(ctx, `
		INSERT INTO password_resets (email, code_hash, expires_at, attempts, token_hash, token_expires_at, created_at)
		VALUES (?, ?, ?, 0, '', '', ?)
		ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at,
			attempts = 0, token_hash = '', token_expires_at = '', created_at = excluded.created_at`,
		email, hash(code), now.Add(CodeTTL).Format(time.RFC3339Nano), now.Format(time.RFC3339Nano))
	return code, 0, err
}

// Verify checks a code and, if right, returns a one-time reset token.
func (s *Service) Verify(ctx context.Context, email, code string) (string, error) {
	email = norm(email)
	var codeHash, expires string
	var attempts int
	err := s.db.QueryRowContext(ctx, `SELECT code_hash, expires_at, attempts FROM password_resets WHERE email = ?`, email).
		Scan(&codeHash, &expires, &attempts)
	if errors.Is(err, sql.ErrNoRows) || (err == nil && codeHash == "") {
		return "", ErrInvalidCode
	}
	if err != nil {
		return "", err
	}
	if attempts >= MaxAttempts {
		return "", ErrTooMany
	}
	if t, _ := time.Parse(time.RFC3339Nano, expires); s.now().After(t) {
		return "", ErrExpired
	}
	if hash(strings.TrimSpace(code)) != codeHash {
		_, _ = s.db.ExecContext(ctx, `UPDATE password_resets SET attempts = attempts + 1 WHERE email = ?`, email)
		if attempts+1 >= MaxAttempts {
			return "", ErrTooMany
		}
		return "", ErrInvalidCode
	}

	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	token := hex.EncodeToString(buf)
	_, err = s.db.ExecContext(ctx,
		`UPDATE password_resets SET code_hash = '', token_hash = ?, token_expires_at = ? WHERE email = ?`,
		hash(token), s.now().UTC().Add(TokenTTL).Format(time.RFC3339Nano), email)
	return token, err
}

// Consume validates a reset token once and returns its email.
func (s *Service) Consume(ctx context.Context, token string) (string, error) {
	if strings.TrimSpace(token) == "" {
		return "", ErrBadToken
	}
	var email, expires string
	err := s.db.QueryRowContext(ctx,
		`SELECT email, token_expires_at FROM password_resets WHERE token_hash = ?`, hash(token)).
		Scan(&email, &expires)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrBadToken
	}
	if err != nil {
		return "", err
	}
	if t, _ := time.Parse(time.RFC3339Nano, expires); s.now().After(t) {
		return "", ErrBadToken
	}
	_, err = s.db.ExecContext(ctx, `DELETE FROM password_resets WHERE email = ?`, email)
	return email, err
}

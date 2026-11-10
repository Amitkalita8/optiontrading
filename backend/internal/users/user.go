package users

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

var (
	ErrNotFound      = errors.New("user not found")
	ErrAlreadyExists = errors.New("user with this email already exists")
	ErrInvalidInput  = errors.New("invalid user input")
)

type User struct {
	ID           int64  `json:"id"`
	Name         string `json:"name"`
	Email        string `json:"email"`
	PasswordHash string `json:"-"`
	Provider     string `json:"provider"`
	AvatarURL    string `json:"avatar_url,omitempty"`
	CreatedAt    string `json:"created_at"`
	UpdatedAt    string `json:"updated_at"`
}

// HashPassword returns a bcrypt hash of the password.
func HashPassword(password string) string {
	h, err := bcrypt.GenerateFromPassword(bcryptInput(password), bcrypt.DefaultCost)
	if err != nil {
		panic("bcrypt: " + err.Error()) // only fails on bad cost or input over 72 bytes, both excluded
	}
	return string(h)
}

// bcryptInput keeps passwords within bcrypt's 72-byte limit by pre-hashing long ones.
func bcryptInput(password string) []byte {
	if len(password) > 72 {
		return []byte(legacyHash(password))
	}
	return []byte(password)
}

// legacyHash is the unsalted SHA-256 used before bcrypt. Stored legacy hashes
// still verify and are upgraded to bcrypt at the next successful sign-in.
func legacyHash(password string) string {
	sum := sha256.Sum256([]byte(password))
	return hex.EncodeToString(sum[:])
}

// HasPassword reports whether a stored hash holds a real password (accounts
// created by Google sign-in, or before passwords existed, have none).
func HasPassword(hash string) bool {
	return hash != "" && hash != legacyHash("")
}

// CheckPassword reports whether password matches the stored hash, and whether
// the hash is the legacy format and should be replaced with HashPassword.
func CheckPassword(hash, password string) (ok, upgrade bool) {
	if !HasPassword(hash) {
		return false, false
	}
	if strings.HasPrefix(hash, "$2") {
		return bcrypt.CompareHashAndPassword([]byte(hash), bcryptInput(password)) == nil, false
	}
	ok = subtle.ConstantTimeCompare([]byte(hash), []byte(legacyHash(password))) == 1
	return ok, ok
}

func (u *User) Normalize() {
	u.Email = strings.TrimSpace(strings.ToLower(u.Email))
	u.Name = strings.TrimSpace(u.Name)
	if u.Provider == "" {
		u.Provider = "email"
	}
	if u.CreatedAt == "" {
		u.CreatedAt = time.Now().UTC().Format(time.RFC3339)
	}
	if u.UpdatedAt == "" {
		u.UpdatedAt = u.CreatedAt
	}
}

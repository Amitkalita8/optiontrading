// Package profiles stores each user's personal details and regional
// preferences (Settings › Profile).
package profiles

import (
	"context"
	"database/sql"
	"errors"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"
)

var ErrNotFound = errors.New("profile not found")

// Languages the frontend has translations for.
var Languages = []string{"en", "hi", "es", "de", "fr", "ru"}

// DateFormats the frontend knows how to render.
var DateFormats = []string{"DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"}

// MaxPhotoBytes caps the stored photo (a small data URL the client resizes).
const MaxPhotoBytes = 300 << 10

type Profile struct {
	UserID      string    `json:"-"`
	FullName    string    `json:"fullName"`
	DisplayName string    `json:"displayName"`
	CountryCode string    `json:"countryCode"` // phone dial code, e.g. "+91"
	Phone       string    `json:"phone"`       // digits only
	Country     string    `json:"country"`     // ISO 3166-1 alpha-2, e.g. "IN"
	Language    string    `json:"language"`    // e.g. "en"
	TimeZone    string    `json:"timeZone"`    // IANA, e.g. "Asia/Kolkata"
	DateFormat  string    `json:"dateFormat"`
	Photo       string    `json:"photo"` // data:image/… URL or ""
	UpdatedAt   time.Time `json:"updatedAt"`
}

var (
	dialPattern    = regexp.MustCompile(`^\+\d{1,4}$`)
	phonePattern   = regexp.MustCompile(`^\d{6,14}$`)
	countryPattern = regexp.MustCompile(`^[A-Z]{2}$`)
)

// Normalize trims input before validation.
func (p *Profile) Normalize() {
	p.FullName = strings.TrimSpace(p.FullName)
	p.DisplayName = strings.TrimSpace(p.DisplayName)
	p.CountryCode = strings.TrimSpace(p.CountryCode)
	p.Phone = strings.TrimSpace(p.Phone)
	p.Country = strings.ToUpper(strings.TrimSpace(p.Country))
	p.Language = strings.ToLower(strings.TrimSpace(p.Language))
	p.TimeZone = strings.TrimSpace(p.TimeZone)
	p.DateFormat = strings.TrimSpace(p.DateFormat)
}

// Validate returns field -> message for every invalid field.
func (p *Profile) Validate() map[string]string {
	errs := map[string]string{}
	switch n := utf8.RuneCountInString(p.FullName); {
	case n == 0:
		errs["fullName"] = "Enter your full name."
	case n > 80:
		errs["fullName"] = "Keep the name under 80 characters."
	}
	if utf8.RuneCountInString(p.DisplayName) > 40 {
		errs["displayName"] = "Keep the display name under 40 characters."
	}
	if !dialPattern.MatchString(p.CountryCode) {
		errs["countryCode"] = "Choose a country code."
	}
	if p.Phone != "" && !phonePattern.MatchString(p.Phone) {
		errs["phone"] = "Enter 6–14 digits, without spaces."
	}
	if !countryPattern.MatchString(p.Country) {
		errs["country"] = "Choose a country."
	}
	if !contains(Languages, p.Language) {
		errs["language"] = "Choose a supported language."
	}
	if _, err := time.LoadLocation(p.TimeZone); err != nil || p.TimeZone == "" || p.TimeZone == "Local" {
		errs["timeZone"] = "Choose a valid time zone."
	}
	if !contains(DateFormats, p.DateFormat) {
		errs["dateFormat"] = "Choose a date format."
	}
	if p.Photo != "" && (!strings.HasPrefix(p.Photo, "data:image/") || len(p.Photo) > MaxPhotoBytes) {
		errs["photo"] = "Use a smaller image (JPEG or PNG)."
	}
	return errs
}

func contains(list []string, v string) bool {
	for _, x := range list {
		if x == v {
			return true
		}
	}
	return false
}

type Repository struct {
	db  *sql.DB
	now func() time.Time
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db, now: time.Now}
}

const columns = `user_id, full_name, display_name, country_code, phone, country, language, time_zone, date_format, photo, updated_at`

// Get returns the user's profile or ErrNotFound if they never saved one.
func (r *Repository) Get(ctx context.Context, userID string) (Profile, error) {
	var p Profile
	var updated string
	err := r.db.QueryRowContext(ctx, `SELECT `+columns+` FROM profiles WHERE user_id = ? COLLATE NOCASE`, userID).Scan(
		&p.UserID, &p.FullName, &p.DisplayName, &p.CountryCode, &p.Phone, &p.Country,
		&p.Language, &p.TimeZone, &p.DateFormat, &p.Photo, &updated)
	if errors.Is(err, sql.ErrNoRows) {
		return Profile{}, ErrNotFound
	}
	if err != nil {
		return Profile{}, err
	}
	p.UpdatedAt, _ = time.Parse(time.RFC3339Nano, updated)
	return p, nil
}

// Save inserts or replaces the user's profile. Call Validate first.
func (r *Repository) Save(ctx context.Context, p Profile) (Profile, error) {
	p.UpdatedAt = r.now().UTC()
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO profiles (`+columns+`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(user_id) DO UPDATE SET
			full_name = excluded.full_name, display_name = excluded.display_name,
			country_code = excluded.country_code, phone = excluded.phone, country = excluded.country,
			language = excluded.language, time_zone = excluded.time_zone, date_format = excluded.date_format,
			photo = excluded.photo, updated_at = excluded.updated_at`,
		strings.ToLower(p.UserID), p.FullName, p.DisplayName, p.CountryCode, p.Phone, p.Country,
		p.Language, p.TimeZone, p.DateFormat, p.Photo, p.UpdatedAt.Format(time.RFC3339Nano))
	if err != nil {
		return Profile{}, err
	}
	return p, nil
}

package users

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, u *User) error {
	u.Normalize()
	if u.Email == "" || u.Name == "" {
		return ErrInvalidInput
	}

	query := `
		INSERT INTO users (name, email, password_hash, provider, avatar_url, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`
	res, err := r.db.ExecContext(ctx, query,
		u.Name,
		u.Email,
		u.PasswordHash,
		u.Provider,
		u.AvatarURL,
		u.CreatedAt,
		u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return err
		}
		return fmt.Errorf("%w: %v", ErrAlreadyExists, err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return err
	}
	u.ID = id
	return nil
}

func (r *Repository) FindByEmail(ctx context.Context, email string) (*User, error) {
	query := `
		SELECT id, name, email, password_hash, provider, avatar_url, created_at, updated_at
		FROM users
		WHERE email = ? COLLATE NOCASE
	`
	var u User
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&u.ID,
		&u.Name,
		&u.Email,
		&u.PasswordHash,
		&u.Provider,
		&u.AvatarURL,
		&u.CreatedAt,
		&u.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *Repository) FindByIDOrEmail(ctx context.Context, identifier string) (*User, error) {
	query := `
		SELECT id, name, email, password_hash, provider, avatar_url, created_at, updated_at
		FROM users
		WHERE email = ? COLLATE NOCASE OR CAST(id AS TEXT) = ?
		LIMIT 1
	`
	var u User
	err := r.db.QueryRowContext(ctx, query, identifier, identifier).Scan(
		&u.ID,
		&u.Name,
		&u.Email,
		&u.PasswordHash,
		&u.Provider,
		&u.AvatarURL,
		&u.CreatedAt,
		&u.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *Repository) List(ctx context.Context) ([]User, error) {
	query := `
		SELECT id, name, email, password_hash, provider, avatar_url, created_at, updated_at
		FROM users
		ORDER BY id ASC
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []User
	for rows.Next() {
		var u User
		if err := rows.Scan(
			&u.ID,
			&u.Name,
			&u.Email,
			&u.PasswordHash,
			&u.Provider,
			&u.AvatarURL,
			&u.CreatedAt,
			&u.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, u)
	}
	return list, nil
}

func (r *Repository) SeedDemo(ctx context.Context) error {
	var count int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM users`).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	now := time.Now().UTC().Format(time.RFC3339)
	demoUsers := []User{
		{
			Name:         "Administrator",
			Email:        "root@optiontrading.local",
			PasswordHash: HashPassword("Ak123456."),
			Provider:     "email",
			AvatarURL:    "https://ui-avatars.com/api/?name=Admin+Root&background=0284c7&color=fff",
			CreatedAt:    now,
			UpdatedAt:    now,
		},
		{
			Name:         "Alex Morgan",
			Email:        "alex.morgan@example.com",
			PasswordHash: HashPassword("DemoPass123!"),
			Provider:     "email",
			AvatarURL:    "https://ui-avatars.com/api/?name=Alex+Morgan&background=10b981&color=fff",
			CreatedAt:    now,
			UpdatedAt:    now,
		},
		{
			Name:         "John Doe",
			Email:        "john.doe@gmail.com",
			PasswordHash: HashPassword("SecureTrade2026"),
			Provider:     "google",
			AvatarURL:    "https://ui-avatars.com/api/?name=John+Doe&background=8b5cf6&color=fff",
			CreatedAt:    now,
			UpdatedAt:    now,
		},
	}

	for i := range demoUsers {
		if err := r.Create(ctx, &demoUsers[i]); err != nil {
			return err
		}
	}
	return nil
}

// UpdatePassword stores a new password hash and bumps updated_at.
func (r *Repository) UpdatePassword(ctx context.Context, email, hash string) (*User, error) {
	res, err := r.db.ExecContext(ctx,
		`UPDATE users SET password_hash = ?, updated_at = ? WHERE email = ? COLLATE NOCASE`,
		hash, time.Now().UTC().Format(time.RFC3339), email)
	if err != nil {
		return nil, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, ErrNotFound
	}
	return r.FindByEmail(ctx, email)
}

// UpdateName changes the display name on the account (from Settings › Profile).
func (r *Repository) UpdateName(ctx context.Context, email, name string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE users SET name = ?, updated_at = ? WHERE email = ? COLLATE NOCASE`,
		name, time.Now().UTC().Format(time.RFC3339), email)
	return err
}

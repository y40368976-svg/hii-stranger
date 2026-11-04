// Package auth menangani pendaftaran dan login.
package auth

import (
	"context"
	"errors"
	"fmt"

	"hii-stranger1/backend/internal/app/api/user"
	"hii-stranger1/backend/internal/pkg/password"
	"hii-stranger1/backend/internal/pkg/token"
)

// ErrInvalidCredentials dipakai untuk email tidak ditemukan, password salah,
// dan akun tidak aktif, supaya pemanggil tidak bisa membedakan ketiganya.
var ErrInvalidCredentials = errors.New("auth: invalid credentials")

// Service berisi logika bisnis autentikasi.
type Service struct {
	users  *user.Repository
	tokens *token.Manager
}

// NewService membuat Service.
func NewService(users *user.Repository, tokens *token.Manager) *Service {
	return &Service{users: users, tokens: tokens}
}

// RegisterInput adalah data pendaftaran yang sudah divalidasi dan dinormalisasi.
type RegisterInput struct {
	Name     string
	Email    string
	Password string
	Phone    *string
}

// Result adalah isi response register dan login (schema AuthResult).
type Result struct {
	AccessToken string        `json:"access_token"`
	TokenType   string        `json:"token_type"`
	ExpiresIn   int           `json:"expires_in"`
	User        user.Response `json:"user"`
}

// Register membuat akun customer baru dan langsung menerbitkan token.
// Mengembalikan user.ErrEmailTaken bila email sudah terdaftar.
func (s *Service) Register(ctx context.Context, in RegisterInput) (Result, error) {
	hash, err := password.Hash(in.Password)
	if err != nil {
		return Result{}, fmt.Errorf("auth: hash password: %w", err)
	}

	u, err := s.users.Create(ctx, user.User{
		Name:         in.Name,
		Email:        in.Email,
		PasswordHash: hash,
		Phone:        in.Phone,
		Role:         user.RoleCustomer,
		Status:       user.StatusActive,
	})
	if err != nil {
		return Result{}, err
	}
	return s.issue(u)
}

// Login memverifikasi kredensial dan menerbitkan token. Mengembalikan
// ErrInvalidCredentials untuk semua kegagalan kredensial.
func (s *Service) Login(ctx context.Context, email, plain string) (Result, error) {
	u, err := s.users.GetByEmail(ctx, email)
	if errors.Is(err, user.ErrNotFound) {
		password.VerifyDummy(plain)
		return Result{}, ErrInvalidCredentials
	}
	if err != nil {
		return Result{}, err
	}

	if !password.Verify(u.PasswordHash, plain) || u.Status != user.StatusActive {
		return Result{}, ErrInvalidCredentials
	}
	return s.issue(u)
}

func (s *Service) issue(u user.User) (Result, error) {
	tok, err := s.tokens.Issue(u.ID, u.Role)
	if err != nil {
		return Result{}, fmt.Errorf("auth: issue token: %w", err)
	}
	return Result{
		AccessToken: tok,
		TokenType:   "Bearer",
		ExpiresIn:   int(s.tokens.TTL().Seconds()),
		User:        u.Response(),
	}, nil
}

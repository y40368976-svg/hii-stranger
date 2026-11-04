package banner

import "context"

// Service berisi logika bisnis banner.
type Service struct {
	repo *Repository
}

// NewService membuat Service.
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// List mengambil daftar banner. Hak akses include_inactive dicek di handler.
func (s *Service) List(ctx context.Context, includeInactive bool) ([]Banner, error) {
	return s.repo.List(ctx, includeInactive)
}

// Create membuat banner baru.
func (s *Service) Create(ctx context.Context, b Banner) (Banner, error) {
	return s.repo.Create(ctx, b)
}

// Update mengubah banner.
func (s *Service) Update(ctx context.Context, id string, ch Changes) (Banner, error) {
	return s.repo.Update(ctx, id, ch)
}

// Delete menghapus banner.
func (s *Service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

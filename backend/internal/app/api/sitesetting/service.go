package sitesetting

import "context"

// Service berisi logika bisnis pengaturan situs.
type Service struct {
	repo *Repository
}

// NewService membuat Service.
func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

// Get mengambil pengaturan situs saat ini.
func (s *Service) Get(ctx context.Context) (Settings, error) {
	return s.repo.Get(ctx)
}

// Update mengganti seluruh pengaturan situs.
func (s *Service) Update(ctx context.Context, in Settings) (Settings, error) {
	return s.repo.Save(ctx, in)
}

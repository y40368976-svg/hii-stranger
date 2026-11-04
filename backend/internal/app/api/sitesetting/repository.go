package sitesetting

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// singletonID adalah id satu-satunya baris di tabel site_settings.
const singletonID = 1

// Repository mengakses tabel site_settings.
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository membuat Repository di atas pool koneksi.
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// Get membaca pengaturan. Bila barisnya belum pernah dibuat, dikembalikan
// nilai bawaan (maintenance mati).
func (r *Repository) Get(ctx context.Context) (Settings, error) {
	var s Settings
	err := r.db.QueryRow(ctx,
		`SELECT maintenance_mode, maintenance_message FROM site_settings WHERE id = $1`,
		singletonID).Scan(&s.MaintenanceMode, &s.MaintenanceMessage)
	if errors.Is(err, pgx.ErrNoRows) {
		return Settings{}, nil
	}
	if err != nil {
		return Settings{}, fmt.Errorf("sitesetting: get: %w", err)
	}
	return s, nil
}

// Save mengganti seluruh isi pengaturan; baris dibuat bila belum ada.
func (r *Repository) Save(ctx context.Context, s Settings) (Settings, error) {
	var out Settings
	err := r.db.QueryRow(ctx,
		`INSERT INTO site_settings (id, maintenance_mode, maintenance_message)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (id) DO UPDATE
		    SET maintenance_mode = EXCLUDED.maintenance_mode,
		        maintenance_message = EXCLUDED.maintenance_message
		 RETURNING maintenance_mode, maintenance_message`,
		singletonID, s.MaintenanceMode, s.MaintenanceMessage).Scan(&out.MaintenanceMode, &out.MaintenanceMessage)
	if err != nil {
		return Settings{}, fmt.Errorf("sitesetting: save: %w", err)
	}
	return out, nil
}

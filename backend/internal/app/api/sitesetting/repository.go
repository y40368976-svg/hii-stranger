package sitesetting

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	singletonID     = 1
	settingsColumns = `maintenance_mode, maintenance_message, qris_image_url, qris_merchant_name, qris_nmid, payment_window_hours`
	defaultMessage  = "Toko sedang dalam perawatan. Silakan kembali beberapa saat lagi."
	defaultWindow   = 24
)

// Repository mengakses tabel site_settings.
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository membuat Repository.
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// Get mengembalikan pengaturan; nilai default bila baris belum ada.
func (r *Repository) Get(ctx context.Context) (Settings, error) {
	s, err := scan(r.db.QueryRow(ctx, `SELECT `+settingsColumns+` FROM site_settings WHERE id = $1`, singletonID))
	if errors.Is(err, pgx.ErrNoRows) {
		return Settings{MaintenanceMessage: defaultMessage, PaymentWindowHours: defaultWindow}, nil
	}
	if err != nil {
		return Settings{}, fmt.Errorf("sitesetting: get: %w", err)
	}
	return s, nil
}

// Save menyimpan seluruh pengaturan (upsert baris tunggal).
func (r *Repository) Save(ctx context.Context, s Settings) (Settings, error) {
	out, err := scan(r.db.QueryRow(ctx,
		`INSERT INTO site_settings (id, maintenance_mode, maintenance_message, qris_image_url,
		                            qris_merchant_name, qris_nmid, payment_window_hours)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 ON CONFLICT (id) DO UPDATE
		    SET maintenance_mode = EXCLUDED.maintenance_mode,
		        maintenance_message = EXCLUDED.maintenance_message,
		        qris_image_url = EXCLUDED.qris_image_url,
		        qris_merchant_name = EXCLUDED.qris_merchant_name,
		        qris_nmid = EXCLUDED.qris_nmid,
		        payment_window_hours = EXCLUDED.payment_window_hours
		 RETURNING `+settingsColumns,
		singletonID, s.MaintenanceMode, s.MaintenanceMessage, s.QRISImageURL,
		s.QRISMerchantName, s.QRISNMID, s.PaymentWindowHours))
	if err != nil {
		return Settings{}, fmt.Errorf("sitesetting: save: %w", err)
	}
	return out, nil
}

func scan(row pgx.Row) (Settings, error) {
	var s Settings
	err := row.Scan(&s.MaintenanceMode, &s.MaintenanceMessage, &s.QRISImageURL,
		&s.QRISMerchantName, &s.QRISNMID, &s.PaymentWindowHours)
	return s, err
}

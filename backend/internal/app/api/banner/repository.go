package banner

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const bannerColumns = `id, image_url, link_url, sort_order, is_active`

// Repository mengakses tabel banners.
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository membuat Repository di atas pool koneksi.
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// List mengambil banner urut sort_order naik. Banner nonaktif hanya ikut bila
// includeInactive bernilai true.
func (r *Repository) List(ctx context.Context, includeInactive bool) ([]Banner, error) {
	query := "SELECT " + bannerColumns + " FROM banners"
	if !includeInactive {
		query += " WHERE is_active"
	}
	rows, err := r.db.Query(ctx, query+" ORDER BY sort_order, id")
	if err != nil {
		return nil, fmt.Errorf("banner: list: %w", err)
	}
	defer rows.Close()

	out := make([]Banner, 0)
	for rows.Next() {
		b, err := scanBanner(rows)
		if err != nil {
			return nil, fmt.Errorf("banner: list scan: %w", err)
		}
		out = append(out, b)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("banner: list rows: %w", err)
	}
	return out, nil
}

// Create menyimpan banner baru.
func (r *Repository) Create(ctx context.Context, b Banner) (Banner, error) {
	created, err := scanBanner(r.db.QueryRow(ctx,
		`INSERT INTO banners (image_url, link_url, sort_order, is_active)
		 VALUES ($1, $2, $3, $4)
		 RETURNING `+bannerColumns,
		b.ImageURL, b.LinkURL, b.SortOrder, b.IsActive))
	if err != nil {
		return Banner{}, fmt.Errorf("banner: create: %w", err)
	}
	return created, nil
}

// Update mengubah field yang tidak nil dalam satu query. ErrNotFound bila
// banner tidak ada.
func (r *Repository) Update(ctx context.Context, id string, ch Changes) (Banner, error) {
	args := []any{id}
	var sets []string
	set := func(col string, v any) {
		args = append(args, v)
		sets = append(sets, fmt.Sprintf("%s = $%d", col, len(args)))
	}
	if ch.ImageURL != nil {
		set("image_url", *ch.ImageURL)
	}
	if ch.LinkURL != nil {
		var link *string // string kosong disimpan sebagai NULL
		if *ch.LinkURL != "" {
			link = ch.LinkURL
		}
		set("link_url", link)
	}
	if ch.SortOrder != nil {
		set("sort_order", *ch.SortOrder)
	}
	if ch.IsActive != nil {
		set("is_active", *ch.IsActive)
	}

	query := "SELECT " + bannerColumns + " FROM banners WHERE id = $1"
	if len(sets) > 0 {
		query = "UPDATE banners SET " + strings.Join(sets, ", ") + " WHERE id = $1 RETURNING " + bannerColumns
	}
	b, err := scanBanner(r.db.QueryRow(ctx, query, args...))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return Banner{}, err
		}
		return Banner{}, fmt.Errorf("banner: update: %w", err)
	}
	return b, nil
}

// Delete menghapus banner. ErrNotFound bila tidak ada.
func (r *Repository) Delete(ctx context.Context, id string) error {
	tag, err := r.db.Exec(ctx, "DELETE FROM banners WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("banner: delete: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func scanBanner(row pgx.Row) (Banner, error) {
	var b Banner
	err := row.Scan(&b.ID, &b.ImageURL, &b.LinkURL, &b.SortOrder, &b.IsActive)
	if errors.Is(err, pgx.ErrNoRows) {
		return Banner{}, ErrNotFound
	}
	return b, err
}

// Package banner mengelola banner promosi di halaman depan.
package banner

import "errors"

// ErrNotFound berarti banner tidak ada.
var ErrNotFound = errors.New("banner: not found")

// Banner adalah satu baris tabel banners (schema Banner).
type Banner struct {
	ID        string  `json:"id"`
	ImageURL  string  `json:"image_url"`
	LinkURL   *string `json:"link_url"`
	SortOrder int     `json:"sort_order"`
	IsActive  bool    `json:"is_active"`
}

// Changes adalah perubahan banner yang sudah divalidasi; nil berarti tidak
// diubah. LinkURL berisi string kosong berarti link dikosongkan (NULL).
type Changes struct {
	ImageURL  *string
	LinkURL   *string
	SortOrder *int
	IsActive  *bool
}

// createRequest adalah body POST /banners.
type createRequest struct {
	ImageURL  string  `json:"image_url"`
	LinkURL   *string `json:"link_url"`
	SortOrder int     `json:"sort_order"`
	IsActive  *bool   `json:"is_active"`
}

// updateRequest adalah body PATCH /banners/{bannerId}.
type updateRequest struct {
	ImageURL  *string `json:"image_url"`
	LinkURL   *string `json:"link_url"`
	SortOrder *int    `json:"sort_order"`
	IsActive  *bool   `json:"is_active"`
}

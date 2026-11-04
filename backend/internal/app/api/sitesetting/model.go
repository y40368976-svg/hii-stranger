// Package sitesetting mengelola pengaturan situs, termasuk mode maintenance.
// Tabel site_settings hanya berisi satu baris (singleton) dengan id = 1.
package sitesetting

// Settings adalah isi pengaturan situs (schema SiteSettings).
type Settings struct {
	MaintenanceMode    bool   `json:"maintenance_mode"`
	MaintenanceMessage string `json:"maintenance_message"`
}

// updateRequest adalah body PUT /site-settings. Pointer dipakai agar field
// wajib yang tidak dikirim bisa dikenali.
type updateRequest struct {
	MaintenanceMode    *bool   `json:"maintenance_mode"`
	MaintenanceMessage *string `json:"maintenance_message"`
}

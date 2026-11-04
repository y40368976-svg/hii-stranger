package sitesetting

import (
	"log/slog"
	"net/http"
	"strings"

	"hii-stranger1/backend/internal/pkg/response"
	"hii-stranger1/backend/internal/pkg/validator"
)

// Handler melayani endpoint /site-settings.
type Handler struct {
	svc *Service
}

// NewHandler membuat Handler.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// Get melayani GET /site-settings (publik). Dibaca frontend untuk menampilkan
// halaman maintenance.
func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	s, err := h.svc.Get(r.Context())
	if err != nil {
		slog.ErrorContext(r.Context(), "get site settings failed", "error", err)
		response.Internal(w)
		return
	}
	response.JSON(w, http.StatusOK, s)
}

// Update melayani PUT /site-settings (admin). Kedua field wajib dikirim
// karena PUT mengganti seluruh isi pengaturan.
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	var req updateRequest
	if !response.Decode(w, r, &req) {
		return
	}

	var c validator.Collector
	c.Check(req.MaintenanceMode != nil, "maintenance_mode", "maintenance_mode wajib diisi (true/false).")
	msg := ""
	if req.MaintenanceMessage != nil {
		msg = strings.TrimSpace(*req.MaintenanceMessage)
	}
	c.Check(validator.RuneLenBetween(msg, 1, 500), "maintenance_message",
		"maintenance_message wajib diisi, maksimal 500 karakter.")
	if errs := c.Errors(); len(errs) > 0 {
		response.Error(w, http.StatusUnprocessableEntity, "validation_failed", "Data tidak valid.", errs...)
		return
	}

	s, err := h.svc.Update(r.Context(), Settings{MaintenanceMode: *req.MaintenanceMode, MaintenanceMessage: msg})
	if err != nil {
		slog.ErrorContext(r.Context(), "update site settings failed", "error", err)
		response.Internal(w)
		return
	}
	response.JSON(w, http.StatusOK, s)
}

package banner

import (
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"hii-stranger1/backend/internal/app/api/middleware"
	"hii-stranger1/backend/internal/app/api/user"
	"hii-stranger1/backend/internal/pkg/response"
	"hii-stranger1/backend/internal/pkg/validator"
)

const (
	imageURLMessage = "image_url harus URL http atau https yang valid."
	linkURLMessage  = "link_url harus URL http atau https yang valid."
)

// Handler melayani endpoint /banners.
type Handler struct {
	svc *Service
}

// NewHandler membuat Handler.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// List melayani GET /banners. Publik; include_inactive=true hanya untuk admin
// (dikenali lewat middleware.AuthenticateOptional), selain admin dijawab 403.
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	includeInactive := false
	if v := r.URL.Query().Get("include_inactive"); v != "" {
		b, err := strconv.ParseBool(v)
		if err != nil {
			response.Error(w, http.StatusBadRequest, "bad_request", "Parameter include_inactive harus true atau false.")
			return
		}
		includeInactive = b
	}
	if includeInactive && !isAdmin(r) {
		response.Error(w, http.StatusForbidden, "forbidden", "Anda tidak memiliki akses.")
		return
	}

	banners, err := h.svc.List(r.Context(), includeInactive)
	if err != nil {
		slog.ErrorContext(r.Context(), "list banners failed", "error", err)
		response.Internal(w)
		return
	}
	response.JSON(w, http.StatusOK, banners)
}

// Create melayani POST /banners (admin).
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var req createRequest
	if !response.Decode(w, r, &req) {
		return
	}

	b := Banner{
		ImageURL:  strings.TrimSpace(req.ImageURL),
		SortOrder: req.SortOrder,
		IsActive:  true, // default sesuai schema BannerCreate
	}
	if req.IsActive != nil {
		b.IsActive = *req.IsActive
	}
	if req.LinkURL != nil {
		if link := strings.TrimSpace(*req.LinkURL); link != "" {
			b.LinkURL = &link
		}
	}

	var c validator.Collector
	c.Check(validator.HTTPURL(b.ImageURL), "image_url", imageURLMessage)
	c.Check(b.LinkURL == nil || validator.HTTPURL(*b.LinkURL), "link_url", linkURLMessage)
	if errs := c.Errors(); len(errs) > 0 {
		validationFailed(w, errs...)
		return
	}

	created, err := h.svc.Create(r.Context(), b)
	if h.writeError(w, r, "create", err) {
		return
	}
	response.JSON(w, http.StatusCreated, created)
}

// Update melayani PATCH /banners/{bannerId} (admin).
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("bannerId")
	if !validator.UUID(id) {
		notFound(w)
		return
	}

	var req updateRequest
	if !response.Decode(w, r, &req) {
		return
	}

	var c validator.Collector
	ch := Changes{SortOrder: req.SortOrder, IsActive: req.IsActive}
	if req.ImageURL != nil {
		u := strings.TrimSpace(*req.ImageURL)
		c.Check(validator.HTTPURL(u), "image_url", imageURLMessage)
		ch.ImageURL = &u
	}
	if req.LinkURL != nil {
		link := strings.TrimSpace(*req.LinkURL)
		c.Check(link == "" || validator.HTTPURL(link), "link_url", linkURLMessage)
		ch.LinkURL = &link
	}
	c.Check(ch != (Changes{}), "body", "Isi minimal satu field yang ingin diubah.")
	if errs := c.Errors(); len(errs) > 0 {
		validationFailed(w, errs...)
		return
	}

	b, err := h.svc.Update(r.Context(), id, ch)
	if h.writeError(w, r, "update", err) {
		return
	}
	response.JSON(w, http.StatusOK, b)
}

// Delete melayani DELETE /banners/{bannerId} (admin).
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("bannerId")
	if !validator.UUID(id) {
		notFound(w)
		return
	}

	err := h.svc.Delete(r.Context(), id)
	if h.writeError(w, r, "delete", err) {
		return
	}
	response.NoContent(w)
}

// writeError menerjemahkan error service menjadi response. Mengembalikan true
// bila err tidak nil (response sudah ditulis).
func (h *Handler) writeError(w http.ResponseWriter, r *http.Request, op string, err error) bool {
	switch {
	case err == nil:
		return false
	case errors.Is(err, ErrNotFound):
		notFound(w)
	default:
		slog.ErrorContext(r.Context(), op+" banner failed", "error", err)
		response.Internal(w)
	}
	return true
}

func isAdmin(r *http.Request) bool {
	p, ok := middleware.PrincipalFrom(r.Context())
	return ok && p.Role == user.RoleAdmin
}

func validationFailed(w http.ResponseWriter, errs ...response.FieldError) {
	response.Error(w, http.StatusUnprocessableEntity, "validation_failed", "Data tidak valid.", errs...)
}

func notFound(w http.ResponseWriter) {
	response.Error(w, http.StatusNotFound, "not_found", "Data tidak ditemukan.")
}

package cart

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"hii-stranger1/backend/internal/app/api/middleware"
	"hii-stranger1/backend/internal/pkg/response"
	"hii-stranger1/backend/internal/pkg/validator"
)

// Handler melayani endpoint /cart.
type Handler struct {
	svc *Service
}

// NewHandler membuat Handler.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// userID mengambil ID user dari authentication middleware.
func userID(r *http.Request) string {
	p, ok := middleware.PrincipalFrom(r.Context())
	if !ok {
		return ""
	}

	return p.UserID
}

// Get melayani GET /cart: isi keranjang milik user yang sedang login.
func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == "" {
		unauthorized(w)
		return
	}

	c, err := h.svc.Get(r.Context(), uid)
	if h.writeError(w, r, "get", err) {
		return
	}

	response.JSON(w, http.StatusOK, c)
}

// Create melayani POST /cart/items.
// Bila varian sudah ada di keranjang, jumlahnya digabung.
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == "" {
		unauthorized(w)
		return
	}

	var req CreateRequest
	if !response.Decode(w, r, &req) {
		return
	}

	req.VariantID = strings.TrimSpace(req.VariantID)

	if errs := validateCreate(req); len(errs) > 0 {
		validationFailed(w, errs...)
		return
	}

	item, err := h.svc.Add(r.Context(), uid, req)
	if h.writeError(w, r, "create", err) {
		return
	}

	response.JSON(w, http.StatusCreated, item)
}

// Update melayani PATCH /cart/items/{cartItemId}: mengubah jumlah item.
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == "" {
		unauthorized(w)
		return
	}

	id := r.PathValue("cartItemId")
	if !validator.UUID(id) {
		notFound(w)
		return
	}

	var req UpdateRequest
	if !response.Decode(w, r, &req) {
		return
	}

	if errs := validateUpdate(req); len(errs) > 0 {
		validationFailed(w, errs...)
		return
	}

	item, err := h.svc.UpdateQuantity(r.Context(), uid, id, *req.Quantity)
	if h.writeError(w, r, "update", err) {
		return
	}

	response.JSON(w, http.StatusOK, item)
}

// Delete melayani DELETE /cart/items/{cartItemId}.
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == "" {
		unauthorized(w)
		return
	}

	id := r.PathValue("cartItemId")
	if !validator.UUID(id) {
		notFound(w)
		return
	}

	err := h.svc.Delete(r.Context(), uid, id)
	if h.writeError(w, r, "delete", err) {
		return
	}

	response.NoContent(w)
}

// Clear melayani DELETE /cart: mengosongkan keranjang user.
func (h *Handler) Clear(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	if uid == "" {
		unauthorized(w)
		return
	}

	err := h.svc.Clear(r.Context(), uid)
	if h.writeError(w, r, "clear", err) {
		return
	}

	response.NoContent(w)
}

// writeError menerjemahkan error service menjadi response.
// Mengembalikan true bila err bukan nil (response sudah ditulis).
func (h *Handler) writeError(
	w http.ResponseWriter,
	r *http.Request,
	op string,
	err error,
) bool {
	switch {
	case err == nil:
		return false

	case errors.Is(err, ErrNotFound):
		notFound(w)

	case errors.Is(err, ErrVariantNotFound):
		validationFailed(w, response.FieldError{
			Field:   "variant_id",
			Message: "Variant tidak ditemukan.",
		})

	case errors.Is(err, ErrInvalidQuantity):
		validationFailed(w, response.FieldError{
			Field:   "quantity",
			Message: "Quantity minimal 1.",
		})

	case errors.Is(err, ErrInsufficientStock):
		response.Error(
			w,
			http.StatusConflict,
			"conflict",
			"Stok tidak mencukupi.",
		)

	case errors.Is(err, ErrUserNotFound):
		unauthorized(w)

	default:
		slog.ErrorContext(r.Context(), op+" cart failed", "error", err)
		response.Internal(w)
	}

	return true
}

// validateCreate memvalidasi body POST /cart/items.
func validateCreate(req CreateRequest) []response.FieldError {
	var c validator.Collector

	c.Check(
		validator.UUID(req.VariantID),
		"variant_id",
		"variant_id harus berupa UUID.",
	)

	c.Check(
		req.Quantity >= 1,
		"quantity",
		"Quantity minimal 1.",
	)

	return c.Errors()
}

// validateUpdate memvalidasi body PATCH /cart/items/{cartItemId}.
func validateUpdate(req UpdateRequest) []response.FieldError {
	var c validator.Collector

	if req.Quantity == nil {
		c.Check(false, "quantity", "quantity wajib diisi.")
		return c.Errors()
	}

	c.Check(*req.Quantity >= 1, "quantity", "Quantity minimal 1.")

	return c.Errors()
}

func validationFailed(w http.ResponseWriter, errs ...response.FieldError) {
	response.Error(
		w,
		http.StatusUnprocessableEntity,
		"validation_failed",
		"Data tidak valid.",
		errs...,
	)
}

func notFound(w http.ResponseWriter) {
	response.Error(
		w,
		http.StatusNotFound,
		"not_found",
		"Data tidak ditemukan.",
	)
}

func unauthorized(w http.ResponseWriter) {
	response.Error(
		w,
		http.StatusUnauthorized,
		"unauthorized",
		"Anda harus login terlebih dahulu.",
	)
}

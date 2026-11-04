package api

import (
	"net/http"
	"time"

	"hii-stranger1/backend/internal/app/api/auth"
	"hii-stranger1/backend/internal/app/api/banner"
	"hii-stranger1/backend/internal/app/api/cart"
	"hii-stranger1/backend/internal/app/api/category"
	"hii-stranger1/backend/internal/app/api/middleware"
	"hii-stranger1/backend/internal/app/api/ongkir"
	"hii-stranger1/backend/internal/app/api/order"
	"hii-stranger1/backend/internal/app/api/payment"
	"hii-stranger1/backend/internal/app/api/product"
	"hii-stranger1/backend/internal/app/api/shipment"
	"hii-stranger1/backend/internal/app/api/sitesetting"
	"hii-stranger1/backend/internal/app/api/upload"
	"hii-stranger1/backend/internal/app/api/user"
	"hii-stranger1/backend/internal/pkg/config"
	"hii-stranger1/backend/internal/pkg/response"
	"hii-stranger1/backend/internal/pkg/token"
)

const (
	apiPrefix = "/api/v1"

	// Batas percobaan login, register, dan ganti password per IP, untuk mempersulit tebak password.
	authRateLimit  = 10
	authRateWindow = time.Minute

	// Batas per IP untuk endpoint publik yang sering dipanggil (pengaturan
	// situs, data wilayah, cek ongkir).
	publicRateLimit  = 120
	publicRateWindow = time.Minute

	// Microcache untuk GET publik (produk, kategori, banner, pengaturan situs).
	// Dikosongkan otomatis setiap ada perubahan data lewat API, jadi ttl hanya
	// batas aman bila data diubah di luar API atau ada lebih dari satu instance.
	publicCacheTTL     = 30 * time.Second
	publicCacheEntries = 5000
)

type handlers struct {
	auth     *auth.Handler
	cart     *cart.Handler
	category *category.Handler
	product  *product.Handler
	user     *user.Handler

	banner      *banner.Handler
	siteSetting *sitesetting.Handler
	ongkir      *ongkir.Handler
	order       *order.Handler
	payment     *payment.Handler
	shipment    *shipment.Handler
	upload      *upload.Handler
}

// newRouter menyusun seluruh route dan middleware global. Route baru
// didaftarkan di sini; rute yang butuh login dibungkus authenticate.
func newRouter(cfg config.Config, tokens *token.Manager, h handlers) http.Handler {
	authenticate := middleware.Authenticate(tokens)
	requireAdmin := middleware.RequireRole(user.RoleAdmin)
	optionalAuthenticate := middleware.AuthenticateOptional(tokens)
	cache := middleware.NewResponseCache(publicCacheTTL, publicCacheEntries)
	cached := cache.Cached()

	mux := http.NewServeMux()
	mux.HandleFunc("GET "+apiPrefix+"/health", health)

	mux.Handle("POST "+apiPrefix+"/auth/register",
		middleware.Chain(http.HandlerFunc(h.auth.Register), middleware.RateLimit(authRateLimit, authRateWindow)))
	mux.Handle("POST "+apiPrefix+"/auth/login",
		middleware.Chain(http.HandlerFunc(h.auth.Login), middleware.RateLimit(authRateLimit, authRateWindow)))

	mux.Handle("GET "+apiPrefix+"/users/me",
		middleware.Chain(http.HandlerFunc(h.user.Me), authenticate))
	mux.Handle("PATCH "+apiPrefix+"/users/me",
		middleware.Chain(http.HandlerFunc(h.user.UpdateMe), authenticate))
	mux.Handle("PUT "+apiPrefix+"/users/me/password",
		middleware.Chain(http.HandlerFunc(h.user.ChangePassword), authenticate, middleware.RateLimit(authRateLimit, authRateWindow)))

	// Publik, tetapi admin dikenali lewat token opsional (lihat include_inactive).
	// GET publik tanpa token dilayani dari cache (lihat middleware.ResponseCache).
	mux.Handle("GET "+apiPrefix+"/categories",
		middleware.Chain(http.HandlerFunc(h.category.List), cached, optionalAuthenticate))
	mux.Handle("GET "+apiPrefix+"/categories/{categoryId}",
		middleware.Chain(http.HandlerFunc(h.category.Get), cached, optionalAuthenticate))
	mux.Handle("POST "+apiPrefix+"/categories",
		middleware.Chain(http.HandlerFunc(h.category.Create), authenticate, requireAdmin))
	mux.Handle("PATCH "+apiPrefix+"/categories/{categoryId}",
		middleware.Chain(http.HandlerFunc(h.category.Update), authenticate, requireAdmin))
	mux.Handle("DELETE "+apiPrefix+"/categories/{categoryId}",
		middleware.Chain(http.HandlerFunc(h.category.Delete), authenticate, requireAdmin))

	// Publik; admin dikenali lewat token opsional (lihat parameter status).
	mux.Handle("GET "+apiPrefix+"/products",
		middleware.Chain(http.HandlerFunc(h.product.List), cached, optionalAuthenticate))
	mux.Handle("GET "+apiPrefix+"/products/{productId}",
		middleware.Chain(http.HandlerFunc(h.product.Get), cached, optionalAuthenticate))
	mux.Handle("POST "+apiPrefix+"/products",
		middleware.Chain(http.HandlerFunc(h.product.Create), authenticate, requireAdmin))
	mux.Handle("PATCH "+apiPrefix+"/products/{productId}",
		middleware.Chain(http.HandlerFunc(h.product.Update), authenticate, requireAdmin))
	mux.Handle("DELETE "+apiPrefix+"/products/{productId}",
		middleware.Chain(http.HandlerFunc(h.product.Delete), authenticate, requireAdmin))

	// Keranjang selalu milik user yang sedang login (lihat token).
	mux.Handle("GET "+apiPrefix+"/cart",
		middleware.Chain(http.HandlerFunc(h.cart.Get), authenticate))
	mux.Handle("DELETE "+apiPrefix+"/cart",
		middleware.Chain(http.HandlerFunc(h.cart.Clear), authenticate))
	mux.Handle("POST "+apiPrefix+"/cart/items",
		middleware.Chain(http.HandlerFunc(h.cart.Create), authenticate))
	mux.Handle("PATCH "+apiPrefix+"/cart/items/{cartItemId}",
		middleware.Chain(http.HandlerFunc(h.cart.Update), authenticate))
	mux.Handle("DELETE "+apiPrefix+"/cart/items/{cartItemId}",
		middleware.Chain(http.HandlerFunc(h.cart.Delete), authenticate))

	mux.Handle("GET "+apiPrefix+"/admin/users",
		middleware.Chain(http.HandlerFunc(h.user.AdminList), authenticate, requireAdmin))
	mux.Handle("GET "+apiPrefix+"/admin/users/{userId}",
		middleware.Chain(http.HandlerFunc(h.user.AdminGet), authenticate, requireAdmin))
	mux.Handle("PATCH "+apiPrefix+"/admin/users/{userId}",
		middleware.Chain(http.HandlerFunc(h.user.AdminUpdate), authenticate, requireAdmin))

	// Varian dan gambar produk (admin).
	mux.Handle("POST "+apiPrefix+"/products/{productId}/variants",
		middleware.Chain(http.HandlerFunc(h.product.CreateVariant), authenticate, requireAdmin))
	mux.Handle("PATCH "+apiPrefix+"/products/{productId}/variants/{variantId}",
		middleware.Chain(http.HandlerFunc(h.product.UpdateVariant), authenticate, requireAdmin))
	mux.Handle("DELETE "+apiPrefix+"/products/{productId}/variants/{variantId}",
		middleware.Chain(http.HandlerFunc(h.product.DeleteVariant), authenticate, requireAdmin))
	mux.Handle("POST "+apiPrefix+"/products/{productId}/images",
		middleware.Chain(http.HandlerFunc(h.product.CreateImage), authenticate, requireAdmin))
	mux.Handle("PATCH "+apiPrefix+"/products/{productId}/images/{imageId}",
		middleware.Chain(http.HandlerFunc(h.product.UpdateImage), authenticate, requireAdmin))
	mux.Handle("DELETE "+apiPrefix+"/products/{productId}/images/{imageId}",
		middleware.Chain(http.HandlerFunc(h.product.DeleteImage), authenticate, requireAdmin))

	// Unggah gambar ke Cloudinary; URL hasilnya dipakai untuk image_url (admin).
	mux.Handle("POST "+apiPrefix+"/admin/uploads/images",
		middleware.Chain(http.HandlerFunc(h.upload.Image), authenticate, requireAdmin))

	// Banner: publik, admin dikenali lewat token opsional (include_inactive).
	mux.Handle("GET "+apiPrefix+"/banners",
		middleware.Chain(http.HandlerFunc(h.banner.List), cached, optionalAuthenticate))
	mux.Handle("POST "+apiPrefix+"/banners",
		middleware.Chain(http.HandlerFunc(h.banner.Create), authenticate, requireAdmin))
	mux.Handle("PATCH "+apiPrefix+"/banners/{bannerId}",
		middleware.Chain(http.HandlerFunc(h.banner.Update), authenticate, requireAdmin))
	mux.Handle("DELETE "+apiPrefix+"/banners/{bannerId}",
		middleware.Chain(http.HandlerFunc(h.banner.Delete), authenticate, requireAdmin))

	// Pengaturan situs (mode maintenance).
	mux.Handle("GET "+apiPrefix+"/site-settings",
		middleware.Chain(http.HandlerFunc(h.siteSetting.Get), middleware.RateLimit(publicRateLimit, publicRateWindow), cached))
	mux.Handle("PUT "+apiPrefix+"/site-settings",
		middleware.Chain(http.HandlerFunc(h.siteSetting.Update), authenticate, requireAdmin))

	// Wilayah berjenjang untuk dropdown alamat (publik, di-cache) dan cek
	// ongkir sampai kelurahan berdasarkan berat keranjang (login).
	// Satu limiter dipakai bersama supaya kuota RajaOngkir tidak habis oleh
	// permintaan ID acak (hasil yang sama tetap dilayani dari cache).
	regionLimit := middleware.RateLimit(publicRateLimit, publicRateWindow)
	mux.Handle("GET "+apiPrefix+"/regions/provinces",
		middleware.Chain(http.HandlerFunc(h.ongkir.Provinces), regionLimit))
	mux.Handle("GET "+apiPrefix+"/regions/provinces/{provinceId}/cities",
		middleware.Chain(http.HandlerFunc(h.ongkir.Cities), regionLimit))
	mux.Handle("GET "+apiPrefix+"/regions/cities/{cityId}/districts",
		middleware.Chain(http.HandlerFunc(h.ongkir.Districts), regionLimit))
	mux.Handle("GET "+apiPrefix+"/regions/districts/{districtId}/subdistricts",
		middleware.Chain(http.HandlerFunc(h.ongkir.SubDistricts), regionLimit))
	mux.Handle("GET "+apiPrefix+"/shipping/costs",
		middleware.Chain(http.HandlerFunc(h.ongkir.Costs), authenticate,
			middleware.RateLimit(publicRateLimit, publicRateWindow)))

	// Order: user melihat ordernya sendiri; admin lewat /admin/orders.
	mux.Handle("GET "+apiPrefix+"/orders",
		middleware.Chain(http.HandlerFunc(h.order.ListMine), authenticate))
	mux.Handle("POST "+apiPrefix+"/orders",
		middleware.Chain(http.HandlerFunc(h.order.Create), authenticate))
	mux.Handle("GET "+apiPrefix+"/orders/{orderId}",
		middleware.Chain(http.HandlerFunc(h.order.Get), authenticate))
	mux.Handle("GET "+apiPrefix+"/admin/orders",
		middleware.Chain(http.HandlerFunc(h.order.AdminList), authenticate, requireAdmin))
	mux.Handle("PUT "+apiPrefix+"/admin/orders/{orderId}/status",
		middleware.Chain(http.HandlerFunc(h.order.AdminUpdateStatus), authenticate, requireAdmin))

	// Pembayaran: pemilik order membuat tagihan & unggah bukti; admin memverifikasi.
	mux.Handle("GET "+apiPrefix+"/orders/{orderId}/payment",
		middleware.Chain(http.HandlerFunc(h.payment.Get), authenticate))
	mux.Handle("POST "+apiPrefix+"/orders/{orderId}/payment",
		middleware.Chain(http.HandlerFunc(h.payment.Create), authenticate))
	mux.Handle("GET "+apiPrefix+"/orders/{orderId}/payment/proof",
		middleware.Chain(http.HandlerFunc(h.payment.GetProof), authenticate))
	mux.Handle("PUT "+apiPrefix+"/orders/{orderId}/payment/proof",
		middleware.Chain(http.HandlerFunc(h.payment.UploadProof), authenticate))
	mux.Handle("GET "+apiPrefix+"/admin/payments",
		middleware.Chain(http.HandlerFunc(h.payment.AdminList), authenticate, requireAdmin))
	mux.Handle("POST "+apiPrefix+"/admin/payments/{paymentId}/review",
		middleware.Chain(http.HandlerFunc(h.payment.AdminReview), authenticate, requireAdmin))

	// Pengiriman: dibaca pemilik order/admin, diisi admin.
	mux.Handle("GET "+apiPrefix+"/orders/{orderId}/shipment",
		middleware.Chain(http.HandlerFunc(h.shipment.Get), authenticate))
	mux.Handle("PUT "+apiPrefix+"/orders/{orderId}/shipment",
		middleware.Chain(http.HandlerFunc(h.shipment.Upsert), authenticate, requireAdmin))

	// Semua yang tidak cocok dijawab dengan format error yang sama.
	mux.HandleFunc("/", notFound)

	return middleware.Chain(mux,
		middleware.Recover(),
		middleware.Logger(),
		middleware.CORS(cfg.FrontendURL),
		// Login, profil, dan keranjang tidak mengubah produk/kategori/banner.
		// Checkout & pembatalan (/orders) mengubah stok, jadi tetap mengosongkan cache.
		cache.InvalidateOnWrite(apiPrefix+"/auth/", apiPrefix+"/users/me", apiPrefix+"/cart"),
		middleware.MaxBody(cfg.MaxBodyBytes),
		middleware.Timeout(cfg.HTTPRequestTimeout),
	)
}

func health(w http.ResponseWriter, _ *http.Request) {
	response.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func notFound(w http.ResponseWriter, _ *http.Request) {
	response.Error(w, http.StatusNotFound, "not_found", "Endpoint tidak ditemukan.")
}

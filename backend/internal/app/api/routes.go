package api

import (
	"net/http"
	"time"

	"github.com/redis/go-redis/v9"

	"hii-stranger1/backend/internal/app/api/auth"
	"hii-stranger1/backend/internal/app/api/banner"
	"hii-stranger1/backend/internal/app/api/cart"
	"hii-stranger1/backend/internal/app/api/category"
	"hii-stranger1/backend/internal/app/api/middleware"
	"hii-stranger1/backend/internal/app/api/ongkir"
	"hii-stranger1/backend/internal/app/api/order"
	"hii-stranger1/backend/internal/app/api/payment"
	"hii-stranger1/backend/internal/app/api/post"
	"hii-stranger1/backend/internal/app/api/product"
	"hii-stranger1/backend/internal/app/api/shipment"
	"hii-stranger1/backend/internal/app/api/sitesetting"
	"hii-stranger1/backend/internal/app/api/upload"
	"hii-stranger1/backend/internal/app/api/user"
	"hii-stranger1/backend/internal/pkg/config"
	"hii-stranger1/backend/internal/pkg/response"
	"hii-stranger1/backend/internal/pkg/token"

	"github.com/prometheus/client_golang/prometheus/promhttp"
)

const (
	apiPrefix = "/api/v1"

	// Batas percobaan login, register, dan ganti password per IP, untuk mempersulit tebak password.
	authRateLimit          = 10
	passwordResetRateLimit = 3
	authRateWindow         = time.Minute

	// Batas per IP untuk endpoint publik yang sering dipanggil (pengaturan
	// situs, data wilayah, cek ongkir).
	publicRateLimit  = 120
	publicRateWindow = time.Minute

	// Microcache di Redis untuk GET publik (produk, kategori, banner,
	// pengaturan situs). Dikosongkan otomatis untuk semua instance setiap ada
	// perubahan data lewat API, jadi ttl hanya batas aman bila data diubah di
	// luar API.
	publicCacheTTL = 30 * time.Second
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
	post        *post.Handler

	// maintenance membaca status mode maintenance dari pengaturan situs.
	maintenance middleware.MaintenanceStatus
}

// newRouter menyusun seluruh route dan middleware global. Route baru
// didaftarkan di sini; rute yang butuh login dibungkus authenticate.
func newRouter(cfg config.Config, tokens *token.Manager, h handlers, rdb *redis.Client) http.Handler {
	authenticate := middleware.Authenticate(tokens)
	requireOwner := middleware.RequireRole(user.RoleOwner)
	// Belanja (keranjang, checkout, pembayaran) hanya untuk akun pelanggan;
	// admin dan staff ditolak di server, bukan hanya disembunyikan di UI.
	requireCustomer := middleware.RequireRole(user.RoleCustomer)
	// Pengelola konten jurnal.
	requireBackoffice := middleware.RequireRole(user.RoleOwner, user.RoleStaff)
	optionalAuthenticate := middleware.AuthenticateOptional(tokens)
	cache := middleware.NewResponseCache(rdb, publicCacheTTL)
	cached := cache.Cached()

	// Routing memakai Gin (lihat router.go); pola rute ditulis gaya net/http.
	mux := newGinMux()
	mux.HandleFunc("GET "+apiPrefix+"/health", health)

	mux.Handle("POST "+apiPrefix+"/auth/register",
		middleware.Chain(http.HandlerFunc(h.auth.Register), middleware.RateLimit(authRateLimit, authRateWindow)))
	mux.Handle("POST "+apiPrefix+"/auth/login",
		middleware.Chain(http.HandlerFunc(h.auth.Login), middleware.RateLimit(authRateLimit, authRateWindow)))

	// Lupa password: limiter terpisah supaya pengiriman email tidak bisa dibanjiri.
	mux.Handle("POST "+apiPrefix+"/auth/password/forgot",
		middleware.Chain(http.HandlerFunc(h.auth.ForgotPassword), middleware.RateLimit(passwordResetRateLimit, authRateWindow)))
	mux.Handle("POST "+apiPrefix+"/auth/password/reset",
		middleware.Chain(http.HandlerFunc(h.auth.ResetPassword), middleware.RateLimit(authRateLimit, authRateWindow)))
	mux.Handle("POST "+apiPrefix+"/auth/verify-email",
		middleware.Chain(http.HandlerFunc(h.auth.VerifyEmail), middleware.RateLimit(authRateLimit, authRateWindow)))
	mux.Handle("POST "+apiPrefix+"/auth/verification/resend",
		middleware.Chain(http.HandlerFunc(h.auth.ResendVerification), authenticate,
			middleware.RateLimit(authRateLimit, authRateWindow)))

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
		middleware.Chain(http.HandlerFunc(h.category.Create), authenticate, requireBackoffice))
	mux.Handle("PATCH "+apiPrefix+"/categories/{categoryId}",
		middleware.Chain(http.HandlerFunc(h.category.Update), authenticate, requireBackoffice))
	mux.Handle("DELETE "+apiPrefix+"/categories/{categoryId}",
		middleware.Chain(http.HandlerFunc(h.category.Delete), authenticate, requireBackoffice))

	// Publik; admin dikenali lewat token opsional (lihat parameter status).
	mux.Handle("GET "+apiPrefix+"/products",
		middleware.Chain(http.HandlerFunc(h.product.List), cached, optionalAuthenticate))
	mux.Handle("GET "+apiPrefix+"/products/{productId}",
		middleware.Chain(http.HandlerFunc(h.product.Get), cached, optionalAuthenticate))
	mux.Handle("POST "+apiPrefix+"/products",
		middleware.Chain(http.HandlerFunc(h.product.Create), authenticate, requireBackoffice))
	mux.Handle("PATCH "+apiPrefix+"/products/{productId}",
		middleware.Chain(http.HandlerFunc(h.product.Update), authenticate, requireBackoffice))
	mux.Handle("DELETE "+apiPrefix+"/products/{productId}",
		middleware.Chain(http.HandlerFunc(h.product.Delete), authenticate, requireBackoffice))

	// Keranjang selalu milik user yang sedang login (lihat token).
	mux.Handle("GET "+apiPrefix+"/cart",
		middleware.Chain(http.HandlerFunc(h.cart.Get), authenticate, requireCustomer))
	mux.Handle("DELETE "+apiPrefix+"/cart",
		middleware.Chain(http.HandlerFunc(h.cart.Clear), authenticate, requireCustomer))
	mux.Handle("POST "+apiPrefix+"/cart/items",
		middleware.Chain(http.HandlerFunc(h.cart.Create), authenticate, requireCustomer))
	mux.Handle("PATCH "+apiPrefix+"/cart/items/{cartItemId}",
		middleware.Chain(http.HandlerFunc(h.cart.Update), authenticate, requireCustomer))
	mux.Handle("DELETE "+apiPrefix+"/cart/items/{cartItemId}",
		middleware.Chain(http.HandlerFunc(h.cart.Delete), authenticate, requireCustomer))

	mux.Handle("GET "+apiPrefix+"/admin/users",
		middleware.Chain(http.HandlerFunc(h.user.AdminList), authenticate, requireOwner))
	mux.Handle("GET "+apiPrefix+"/admin/users/{userId}",
		middleware.Chain(http.HandlerFunc(h.user.AdminGet), authenticate, requireOwner))
	mux.Handle("PATCH "+apiPrefix+"/admin/users/{userId}",
		middleware.Chain(http.HandlerFunc(h.user.AdminUpdate), authenticate, requireOwner))

	// Varian dan gambar produk (admin).
	mux.Handle("POST "+apiPrefix+"/products/{productId}/variants",
		middleware.Chain(http.HandlerFunc(h.product.CreateVariant), authenticate, requireBackoffice))
	mux.Handle("PATCH "+apiPrefix+"/products/{productId}/variants/{variantId}",
		middleware.Chain(http.HandlerFunc(h.product.UpdateVariant), authenticate, requireBackoffice))
	mux.Handle("DELETE "+apiPrefix+"/products/{productId}/variants/{variantId}",
		middleware.Chain(http.HandlerFunc(h.product.DeleteVariant), authenticate, requireBackoffice))
	mux.Handle("POST "+apiPrefix+"/products/{productId}/images",
		middleware.Chain(http.HandlerFunc(h.product.CreateImage), authenticate, requireBackoffice))
	mux.Handle("PATCH "+apiPrefix+"/products/{productId}/images/{imageId}",
		middleware.Chain(http.HandlerFunc(h.product.UpdateImage), authenticate, requireBackoffice))
	mux.Handle("DELETE "+apiPrefix+"/products/{productId}/images/{imageId}",
		middleware.Chain(http.HandlerFunc(h.product.DeleteImage), authenticate, requireBackoffice))

	// Unggah gambar ke Cloudinary; URL hasilnya dipakai untuk image_url (admin).
	mux.Handle("POST "+apiPrefix+"/admin/uploads/images",
		middleware.Chain(http.HandlerFunc(h.upload.Image), authenticate, requireBackoffice))

	// Banner: publik, admin dikenali lewat token opsional (include_inactive).
	mux.Handle("GET "+apiPrefix+"/banners",
		middleware.Chain(http.HandlerFunc(h.banner.List), cached, optionalAuthenticate))
	mux.Handle("POST "+apiPrefix+"/banners",
		middleware.Chain(http.HandlerFunc(h.banner.Create), authenticate, requireBackoffice))
	mux.Handle("PATCH "+apiPrefix+"/banners/{bannerId}",
		middleware.Chain(http.HandlerFunc(h.banner.Update), authenticate, requireBackoffice))
	mux.Handle("DELETE "+apiPrefix+"/banners/{bannerId}",
		middleware.Chain(http.HandlerFunc(h.banner.Delete), authenticate, requireBackoffice))

	// Pengaturan situs (mode maintenance).
	mux.Handle("GET "+apiPrefix+"/site-settings",
		middleware.Chain(http.HandlerFunc(h.siteSetting.Get), middleware.RateLimit(publicRateLimit, publicRateWindow), cached))
	mux.Handle("PUT "+apiPrefix+"/site-settings",
		middleware.Chain(http.HandlerFunc(h.siteSetting.Update), authenticate, requireOwner))

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
		middleware.Chain(http.HandlerFunc(h.ongkir.Costs), authenticate, requireCustomer,
			middleware.RateLimit(publicRateLimit, publicRateWindow)))

	// Order: user melihat ordernya sendiri; admin lewat /admin/orders.
	mux.Handle("GET "+apiPrefix+"/orders",
		middleware.Chain(http.HandlerFunc(h.order.ListMine), authenticate, requireCustomer))
	mux.Handle("POST "+apiPrefix+"/orders",
		middleware.Chain(http.HandlerFunc(h.order.Create), authenticate, requireCustomer))
	mux.Handle("POST "+apiPrefix+"/orders/{orderId}/cancel",
		middleware.Chain(http.HandlerFunc(h.order.Cancel), authenticate, requireCustomer))
	mux.Handle("POST "+apiPrefix+"/orders/{orderId}/complete",
		middleware.Chain(http.HandlerFunc(h.order.Complete), authenticate, requireCustomer))
	mux.Handle("GET "+apiPrefix+"/orders/{orderId}",
		middleware.Chain(http.HandlerFunc(h.order.Get), authenticate))
	mux.Handle("GET "+apiPrefix+"/admin/summary",
		middleware.Chain(http.HandlerFunc(h.order.AdminSummary), authenticate, requireBackoffice))
	mux.Handle("GET "+apiPrefix+"/admin/analytics",
		middleware.Chain(http.HandlerFunc(h.order.AdminAnalytics), authenticate, requireOwner))
	mux.Handle("GET "+apiPrefix+"/admin/orders",
		middleware.Chain(http.HandlerFunc(h.order.AdminList), authenticate, requireBackoffice))
	mux.Handle("PUT "+apiPrefix+"/admin/orders/{orderId}/status",
		middleware.Chain(http.HandlerFunc(h.order.AdminUpdateStatus), authenticate, requireBackoffice))

	// Pembayaran: pemilik order membuat tagihan & unggah bukti; admin memverifikasi.
	mux.Handle("GET "+apiPrefix+"/orders/{orderId}/payment",
		middleware.Chain(http.HandlerFunc(h.payment.Get), authenticate))
	mux.Handle("POST "+apiPrefix+"/orders/{orderId}/payment",
		middleware.Chain(http.HandlerFunc(h.payment.Create), authenticate, requireCustomer))
	mux.Handle("GET "+apiPrefix+"/orders/{orderId}/payment/proof",
		middleware.Chain(http.HandlerFunc(h.payment.GetProof), authenticate))
	mux.Handle("PUT "+apiPrefix+"/orders/{orderId}/payment/proof",
		middleware.Chain(http.HandlerFunc(h.payment.UploadProof), authenticate, requireCustomer))
	mux.Handle("GET "+apiPrefix+"/admin/payments",
		middleware.Chain(http.HandlerFunc(h.payment.AdminList), authenticate, requireBackoffice))
	mux.Handle("POST "+apiPrefix+"/admin/payments/{paymentId}/review",
		middleware.Chain(http.HandlerFunc(h.payment.AdminReview), authenticate, requireBackoffice))

	// Pengiriman: dibaca pemilik order/admin, diisi admin.
	mux.Handle("GET "+apiPrefix+"/orders/{orderId}/shipment",
		middleware.Chain(http.HandlerFunc(h.shipment.Get), authenticate))
	mux.Handle("PUT "+apiPrefix+"/orders/{orderId}/shipment",
		middleware.Chain(http.HandlerFunc(h.shipment.Upsert), authenticate, requireBackoffice))

	// Jurnal: publik membaca artikel terbit (di-cache); admin & staff
	// mengelola semua artikel.
	mux.Handle("GET "+apiPrefix+"/posts",
		middleware.Chain(http.HandlerFunc(h.post.PublicList), cached))
	mux.Handle("GET "+apiPrefix+"/posts/{slug}",
		middleware.Chain(http.HandlerFunc(h.post.PublicGet), cached))
	mux.Handle("GET "+apiPrefix+"/admin/posts",
		middleware.Chain(http.HandlerFunc(h.post.AdminList), authenticate, requireBackoffice))
	mux.Handle("POST "+apiPrefix+"/admin/posts",
		middleware.Chain(http.HandlerFunc(h.post.Create), authenticate, requireBackoffice))
	mux.Handle("GET "+apiPrefix+"/admin/posts/{postId}",
		middleware.Chain(http.HandlerFunc(h.post.AdminGet), authenticate, requireBackoffice))
	mux.Handle("PATCH "+apiPrefix+"/admin/posts/{postId}",
		middleware.Chain(http.HandlerFunc(h.post.Update), authenticate, requireBackoffice))
	mux.Handle("DELETE "+apiPrefix+"/admin/posts/{postId}",
		middleware.Chain(http.HandlerFunc(h.post.Delete), authenticate, requireBackoffice))

	// Semua yang tidak cocok dijawab dengan format error yang sama.
	mux.HandleFunc("/", notFound)

	api := middleware.Chain(mux,
		middleware.Recover(),
		middleware.Logger(),
		middleware.CORS(cfg.FrontendURL),
		// Mode maintenance ditegakkan di server: pelanggan dan pengunjung
		// mendapat 503, staff dan owner tetap dilayani (SDD 3.5).
		middleware.Maintenance(tokens, h.maintenance, apiPrefix, user.RoleOwner, user.RoleStaff),
		// Login, profil, dan keranjang tidak mengubah produk/kategori/banner.
		// Checkout & pembatalan (/orders) mengubah stok, jadi tetap mengosongkan cache.
		cache.InvalidateOnWrite(apiPrefix+"/auth/", apiPrefix+"/users/me", apiPrefix+"/cart"),
		middleware.MaxBody(cfg.MaxBodyBytes),
		middleware.Timeout(cfg.HTTPRequestTimeout),
		// Paling dalam supaya pola rute dari router Gin (r.Pattern) terbaca sebagai label.
		middleware.Metrics(),
	)

	// /metrics dibaca Prometheus dan sengaja di luar middleware API (tidak
	// dicatat di log, tidak kena timeout, tidak ikut dihitung sebagai request API).
	root := http.NewServeMux()
	root.Handle("GET /metrics", promhttp.Handler())
	root.Handle("/", api)
	return root
}

func health(w http.ResponseWriter, _ *http.Request) {
	response.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func notFound(w http.ResponseWriter, _ *http.Request) {
	response.Error(w, http.StatusNotFound, "not_found", "Endpoint tidak ditemukan.")
}

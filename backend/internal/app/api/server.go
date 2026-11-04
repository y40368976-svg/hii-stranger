// Package api merangkai dependensi dan menjalankan server HTTP.
package api

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"hii-stranger1/backend/internal/app/api/auth"
	"hii-stranger1/backend/internal/app/api/banner"
	"hii-stranger1/backend/internal/app/api/cart"
	"hii-stranger1/backend/internal/app/api/category"
	"hii-stranger1/backend/internal/app/api/ongkir"
	"hii-stranger1/backend/internal/app/api/order"
	"hii-stranger1/backend/internal/app/api/payment"
	"hii-stranger1/backend/internal/app/api/product"
	"hii-stranger1/backend/internal/app/api/shipment"
	"hii-stranger1/backend/internal/app/api/sitesetting"
	"hii-stranger1/backend/internal/app/api/upload"
	"hii-stranger1/backend/internal/app/api/user"
	"hii-stranger1/backend/internal/pkg/cloudinary"
	"hii-stranger1/backend/internal/pkg/config"
	"hii-stranger1/backend/internal/pkg/mailer"
	"hii-stranger1/backend/internal/pkg/rajaongkir"
	"hii-stranger1/backend/internal/pkg/token"
)

const shutdownTimeout = 10 * time.Second

// Server membungkus http.Server beserta seluruh dependensinya.
type Server struct {
	http *http.Server
}

// New menyusun repository, service, dan handler lalu membangun router.
// Fitur baru ditambahkan di sini dengan pola yang sama:
// repository -> service -> handler, lalu didaftarkan di routes.go.
func New(cfg config.Config, db *pgxpool.Pool) *Server {
	tokens := token.NewManager(cfg.JWTSecret, cfg.JWTIssuer, cfg.AccessTokenTTL)

	userRepo := user.NewRepository(db)
	categoryRepo := category.NewRepository(db)
	productRepo := product.NewRepository(db)
	cartRepo := cart.NewRepository(db)
	paymentRepo := payment.NewRepository(db)
	shipmentRepo := shipment.NewRepository(db)

	// Layanan luar: email (SMTP Gmail), penyimpanan gambar (Cloudinary), dan
	// wilayah + ongkir sampai kelurahan (RajaOngkir).
	// Keduanya boleh belum dikonfigurasi saat development.
	mail := mailer.New(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPass, cfg.SMTPFrom, cfg.OwnerEmail)
	cdn := cloudinary.New(cfg.CloudinaryCloudName, cfg.CloudinaryAPIKey, cfg.CloudinaryAPISecret, cfg.CloudinaryFolder)

	raja := rajaongkir.New(cfg.RajaOngkirBaseURL, cfg.RajaOngkirAPIKey)
	ongkirSvc := ongkir.NewService(raja, ongkir.NewRepository(db), cfg.RajaOngkirOriginID, cfg.RajaOngkirCouriers)

	h := handlers{
		auth:        auth.NewHandler(auth.NewService(userRepo, tokens)),
		user:        user.NewHandler(user.NewService(userRepo)),
		category:    category.NewHandler(category.NewService(categoryRepo)),
		product:     product.NewHandler(product.NewService(productRepo)),
		cart:        cart.NewHandler(cart.NewService(cartRepo)),
		banner:      banner.NewHandler(banner.NewService(banner.NewRepository(db))),
		siteSetting: sitesetting.NewHandler(sitesetting.NewService(sitesetting.NewRepository(db))),
		ongkir:      ongkir.NewHandler(ongkirSvc),
		order: order.NewHandler(order.NewService(
			order.NewRepository(db), ongkirSvc, paymentRepo, shipmentRepo, mail)),
		payment:  payment.NewHandler(payment.NewService(paymentRepo, mail)),
		shipment: shipment.NewHandler(shipment.NewService(shipmentRepo, mail)),
		upload:   upload.NewHandler(cdn),
	}

	if !mail.Enabled() {
		slog.Warn("SMTP_HOST kosong: email notifikasi tidak dikirim")
	}
	if !raja.Enabled() || cfg.RajaOngkirOriginID == 0 {
		slog.Warn("RAJAONGKIR_API_KEY / RAJAONGKIR_ORIGIN_ID kosong: cek ongkir & checkout dinonaktifkan")
	}
	if !cdn.Enabled() {
		slog.Warn("kredensial Cloudinary kosong: unggah gambar dinonaktifkan")
	}

	return &Server{
		http: &http.Server{
			Addr:              ":" + cfg.Port,
			Handler:           newRouter(cfg, tokens, h),
			ReadHeaderTimeout: 5 * time.Second,
			ReadTimeout:       15 * time.Second,
			WriteTimeout:      cfg.HTTPRequestTimeout + 5*time.Second,
			IdleTimeout:       60 * time.Second,
		},
	}
}

// Run melayani request sampai ctx dibatalkan (mis. Ctrl+C atau SIGTERM),
// lalu mematikan server dengan menunggu request yang sedang berjalan.
func (s *Server) Run(ctx context.Context) error {
	errCh := make(chan error, 1)
	go func() { errCh <- s.http.ListenAndServe() }()

	select {
	case err := <-errCh:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	case <-ctx.Done():
	}

	// ctx sudah dibatalkan, jadi proses shutdown memakai context baru.
	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	return s.http.Shutdown(shutdownCtx)
}

package order

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"slices"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"hii-stranger1/backend/internal/app/api/ongkir"
	"hii-stranger1/backend/internal/app/api/payment"
	"hii-stranger1/backend/internal/app/api/shipment"
	"hii-stranger1/backend/internal/pkg/mailer"
)

// numberAttempts adalah berapa kali checkout dicoba ulang bila nomor order
// kebetulan bentrok.
const numberAttempts = 3

// Service berisi logika bisnis order.
type Service struct {
	repo      *Repository
	ongkir    *ongkir.Service
	payments  *payment.Repository
	shipments *shipment.Repository
	mail      *mailer.Mailer
}

// NewService membuat Service.
func NewService(
	repo *Repository,
	ongkirSvc *ongkir.Service,
	payments *payment.Repository,
	shipments *shipment.Repository,
	mail *mailer.Mailer,
) *Service {
	return &Service{repo: repo, ongkir: ongkirSvc, payments: payments, shipments: shipments, mail: mail}
}

// Checkout membuat order dari keranjang userID. Langkahnya:
//  1. hitung berat keranjang,
//  2. validasi wilayah tujuan (provinsi -> kota -> kecamatan -> kelurahan),
//  3. hitung ulang ongkir ke kelurahan tujuan lewat RajaOngkir memakai
//     layanan termurah dari kurir toko (pelanggan tidak memilih kurir),
//  4. simpan order dalam satu transaksi.
//
// Client tidak bisa mengirim harga, ongkir, atau total sendiri.
func (s *Service) Checkout(ctx context.Context, userID string, in CheckoutInput) (Detail, error) {
	weight, err := s.ongkir.CartWeight(ctx, userID, in.CartItemIDs)
	if errors.Is(err, ongkir.ErrCartEmpty) {
		if len(in.CartItemIDs) > 0 {
			return Detail{}, ErrCartItemNotFound
		}
		return Detail{}, ErrCartEmpty
	}
	if err != nil {
		return Detail{}, err
	}
	addr, err := s.ongkir.Resolve(ctx, in.Destination)
	if err != nil {
		return Detail{}, err
	}
	opt, err := s.ongkir.Cheapest(ctx, addr.SubdistrictID, weight)
	if err != nil {
		return Detail{}, err
	}
	ship := shipping{Address: addr, Option: opt, WeightGram: weight}

	var o Order
	for attempt := 1; ; attempt++ {
		number, err := newOrderNumber()
		if err != nil {
			return Detail{}, err
		}
		o, err = s.repo.Checkout(ctx, userID, number, ship, in)
		if errors.Is(err, errDuplicateNumber) && attempt < numberAttempts {
			continue
		}
		if err != nil {
			return Detail{}, err
		}
		break
	}

	items, err := s.repo.Items(ctx, o.ID)
	if err != nil {
		return Detail{}, err
	}

	s.mail.NotifyOwner("Order baru: "+o.OrderNumber,
		fmt.Sprintf("Ada order baru %s atas nama %s (%s).\nTotal: Rp %s (%d item).\n"+
			"Alamat: %s, Kel. %s, Kec. %s, %s, %s.\nKurir: %s %s (ongkir Rp %s).",
			o.OrderNumber, o.RecipientName, o.RecipientPhone, o.TotalAmount, len(items),
			o.ShippingAddress, addr.Subdistrict, addr.District, addr.City, addr.Province,
			strings.ToUpper(opt.CourierCode), opt.Service, opt.Cost))

	return Detail{Order: o, Items: items}, nil
}

// List mengambil satu halaman order sesuai filter.
func (s *Service) List(ctx context.Context, f Filter, limit, offset int) ([]Order, int, error) {
	return s.repo.List(ctx, f, limit, offset)
}

// Get mengambil detail order (item, pembayaran, pengiriman). Order milik
// user lain dianggap tidak ada kecuali pemanggil admin.
func (s *Service) Get(ctx context.Context, id, userID string, admin bool) (Detail, error) {
	o, items, err := s.repo.GetWithItems(ctx, id)
	if err != nil {
		return Detail{}, err
	}
	if !admin && o.UserID != userID {
		return Detail{}, ErrNotFound
	}

	d := Detail{Order: o, Items: items}

	p, err := s.payments.GetByOrder(ctx, id)
	switch {
	case err == nil:
		d.Payment = &p
	case !errors.Is(err, payment.ErrNotFound):
		return Detail{}, err
	}

	sh, err := s.shipments.GetByOrder(ctx, id)
	switch {
	case err == nil:
		d.Shipment = &sh
	case !errors.Is(err, shipment.ErrNotFound):
		return Detail{}, err
	}
	return d, nil
}

// UpdateStatus mengubah status order (admin) dan memberi tahu pelanggan.
// Untuk status shipped, ship wajib diisi: data pengiriman (kurir + resi)
// disimpan dalam transaksi yang sama dengan perubahan status, lalu email ke
// pelanggan memuat status, kurir, dan no. resi.
func (s *Service) UpdateStatus(ctx context.Context, id, status string, ship *ShipInfo) (Order, error) {
	var sh shipment.Shipment
	var onUpdate func(context.Context, pgx.Tx, Order) error
	if status == StatusShipped {
		if ship == nil || ship.TrackingNumber == "" {
			return Order{}, ErrTrackingRequired
		}
		onUpdate = func(ctx context.Context, tx pgx.Tx, o Order) error {
			courier := ship.CourierName
			if courier == "" {
				courier = courierLabel(o)
			}
			tracking := ship.TrackingNumber
			var err error
			sh, _, err = s.shipments.UpsertTx(ctx, tx, shipment.Shipment{
				OrderID:        o.ID,
				CourierName:    courier,
				TrackingNumber: &tracking,
				CoverageStatus: shipment.CoverageCovered,
				ShippingStatus: shipment.ShippingShipped,
			})
			return err
		}
	}

	o, err := s.repo.UpdateStatus(ctx, id, status, onUpdate)
	if err != nil {
		return Order{}, err
	}

	c, err := s.repo.contactOf(ctx, id)
	if err != nil {
		slog.WarnContext(ctx, "order: load contact for email failed", "error", err)
		return o, nil
	}
	subject := "Status order " + o.OrderNumber + ": " + statusLabel(o.OrderStatus)
	body := fmt.Sprintf("Halo %s,\n\nStatus order %s sekarang: %s.",
		c.Name, o.OrderNumber, statusLabel(o.OrderStatus))
	if status == StatusShipped && sh.TrackingNumber != nil {
		subject = "Pesanan " + o.OrderNumber + " sudah dikirim"
		body += fmt.Sprintf("\n\nKurir: %s\nNo. resi: %s\n\nGunakan no. resi di atas untuk melacak paket di situs kurir.",
			sh.CourierName, *sh.TrackingNumber)
	}
	s.mail.Notify(c.Email, subject, body+"\n\nTerima kasih telah berbelanja!")
	return o, nil
}

// courierLabel membentuk nama kurir dari data checkout, contoh "POS Reguler".
func courierLabel(o Order) string {
	parts := []string{}
	if o.CourierCode != nil {
		parts = append(parts, strings.ToUpper(*o.CourierCode))
	}
	if o.CourierService != nil {
		parts = append(parts, *o.CourierService)
	}
	if len(parts) == 0 {
		return "Kurir toko"
	}
	return strings.Join(parts, " ")
}

// canTransition melaporkan apakah status boleh berubah dari from ke to.
func canTransition(from, to string) bool {
	return slices.Contains(transitions[from], to)
}

// validStatus melaporkan apakah s adalah status order yang dikenal.
func validStatus(s string) bool {
	switch s {
	case StatusPendingPayment, StatusPaid, StatusProcessing, StatusShipped, StatusCompleted, StatusCancelled:
		return true
	}
	return false
}

// statusLabel mengubah kode status menjadi teks yang mudah dibaca pelanggan.
func statusLabel(s string) string {
	switch s {
	case StatusPendingPayment:
		return "Menunggu pembayaran"
	case StatusPaid:
		return "Sudah dibayar"
	case StatusProcessing:
		return "Sedang diproses"
	case StatusShipped:
		return "Dikirim"
	case StatusCompleted:
		return "Selesai"
	case StatusCancelled:
		return "Dibatalkan"
	}
	return s
}

// newOrderNumber membuat nomor order seperti "HS20261104153012-A1B2C3":
// tanggal & jam (agar urut waktu) ditambah 6 karakter acak.
func newOrderNumber() (string, error) {
	b := make([]byte, 3)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("order: random order number: %w", err)
	}
	return "HS" + time.Now().Format("20060102150405") + "-" + strings.ToUpper(hex.EncodeToString(b)), nil
}

// Package order mengelola checkout dari keranjang dan daftar/detail order.
package order

import (
	"errors"

	"hii-stranger1/backend/internal/app/api/ongkir"
	"hii-stranger1/backend/internal/app/api/payment"
	"hii-stranger1/backend/internal/app/api/shipment"
)

var (
	// ErrNotFound berarti order tidak ada atau bukan milik pemanggil.
	ErrNotFound = errors.New("order: not found")
	// ErrCartEmpty berarti tidak ada item keranjang yang bisa di-checkout.
	ErrCartEmpty = errors.New("order: cart is empty")
	// ErrCartItemNotFound berarti ada cart_item_ids yang bukan milik user.
	ErrCartItemNotFound = errors.New("order: cart item not found")
	// ErrProductUnavailable berarti ada produk di keranjang yang sudah tidak tayang.
	ErrProductUnavailable = errors.New("order: product unavailable")
	// ErrInsufficientStock berarti stok varian tidak cukup saat checkout.
	ErrInsufficientStock = errors.New("order: insufficient stock")
	// ErrCartChanged berarti isi keranjang berubah di tengah checkout sehingga
	// ongkir yang dihitung tidak lagi sesuai berat paket.
	ErrCartChanged = errors.New("order: cart changed during checkout")
	// ErrTrackingRequired berarti status shipped dikirim tanpa no. resi.
	ErrTrackingRequired = errors.New("order: tracking number required")
	// ErrInvalidTransition berarti perubahan status order tidak diizinkan.
	ErrInvalidTransition = errors.New("order: invalid status transition")
	// errDuplicateNumber berarti nomor order bentrok (sangat jarang); dicoba ulang.
	errDuplicateNumber = errors.New("order: duplicate order number")
)

// Status order. Alur normal:
//
//	pending_payment -> paid (otomatis saat pembayaran disetujui admin)
//	paid -> processing -> shipped -> completed
//
// Order dapat dibatalkan (cancelled) selama belum dikirim; stok dikembalikan.
const (
	StatusPendingPayment = "pending_payment"
	StatusPaid           = "paid"
	StatusProcessing     = "processing"
	StatusShipped        = "shipped"
	StatusCompleted      = "completed"
	StatusCancelled      = "cancelled"
)

// transitions adalah perubahan status yang boleh dilakukan admin lewat
// PUT /admin/orders/{orderId}/status. pending_payment -> paid sengaja tidak
// ada karena terjadi lewat verifikasi pembayaran.
var transitions = map[string][]string{
	StatusPendingPayment: {StatusCancelled},
	StatusPaid:           {StatusProcessing, StatusCancelled},
	StatusProcessing:     {StatusShipped, StatusCancelled},
	StatusShipped:        {StatusCompleted},
}

// Order adalah satu baris tabel orders (schema Order). Nilai uang berupa
// string desimal.
type Order struct {
	ID                string  `json:"id"`
	OrderNumber       string  `json:"order_number"`
	UserID            string  `json:"user_id"`
	RecipientName     string  `json:"recipient_name"`
	RecipientPhone    string  `json:"recipient_phone"`
	ShippingAddress   string  `json:"shipping_address"`
	ShippingCity      *string `json:"shipping_city"`
	ShippingKelurahan string  `json:"shipping_kelurahan"`
	Subtotal          string  `json:"subtotal"`
	ShippingCost      string  `json:"shipping_cost"`
	TotalAmount       string  `json:"total_amount"`
	OrderStatus       string  `json:"order_status"`

	// Detail tujuan & kurir dari RajaOngkir. Nullable untuk order lama.
	ShippingProvince      *string `json:"shipping_province"`
	ShippingDistrict      *string `json:"shipping_district"`
	ShippingSubdistrictID *int    `json:"shipping_subdistrict_id"`
	ShippingZipCode       *string `json:"shipping_zip_code"`
	CourierCode           *string `json:"courier_code"`
	CourierService        *string `json:"courier_service"`
	ShippingETD           *string `json:"shipping_etd"`
	ShippingWeightGram    *int    `json:"shipping_weight_gram"`
}

// Item adalah snapshot satu item saat checkout (schema OrderItem).
type Item struct {
	ID          string `json:"id"`
	OrderID     string `json:"order_id"`
	ProductID   string `json:"product_id"`
	VariantID   string `json:"variant_id"`
	ProductName string `json:"product_name"`
	Size        string `json:"size"`
	UnitPrice   string `json:"unit_price"`
	Quantity    int    `json:"quantity"`
	Subtotal    string `json:"subtotal"`
}

// Detail adalah order beserta item, pembayaran, dan pengirimannya (schema
// OrderDetail). Payment/Shipment bernilai null bila belum ada.
type Detail struct {
	Order
	Items    []Item             `json:"items"`
	Payment  *payment.Payment   `json:"payment"`
	Shipment *shipment.Shipment `json:"shipment"`
}

// Filter adalah syarat pencarian daftar order. Field kosong berarti tidak dipakai.
type Filter struct {
	UserID      string
	Status      string
	OrderNumber string
}

// CheckoutInput adalah data checkout yang sudah divalidasi handler.
// Destination berisi ID wilayah dari endpoint /regions; namanya diambil
// server dari RajaOngkir supaya alamat konsisten.
type CheckoutInput struct {
	RecipientName   string
	RecipientPhone  string
	ShippingAddress string // nama jalan, nomor rumah, RT/RW
	Destination     ongkir.Destination
	CartItemIDs     []string
}

// shipping adalah hasil hitung ongkir yang dipakai saat menyimpan order.
type shipping struct {
	Address    ongkir.Address
	Option     ongkir.Option
	WeightGram int
}

// createRequest adalah body POST /orders.
type createRequest struct {
	RecipientName   string   `json:"recipient_name"`
	RecipientPhone  string   `json:"recipient_phone"`
	ShippingAddress string   `json:"shipping_address"`
	ProvinceID      int      `json:"province_id"`
	CityID          int      `json:"city_id"`
	DistrictID      int      `json:"district_id"`
	SubdistrictID   int      `json:"subdistrict_id"`
	CartItemIDs     []string `json:"cart_item_ids"`
}

// statusRequest adalah body PUT /admin/orders/{orderId}/status.
// TrackingNumber wajib (dan CourierName opsional) saat status menjadi shipped.
type statusRequest struct {
	OrderStatus    string  `json:"order_status"`
	TrackingNumber *string `json:"tracking_number"`
	CourierName    *string `json:"courier_name"`
}

// ShipInfo adalah data resi yang diisi admin saat order dikirim.
type ShipInfo struct {
	TrackingNumber string
	CourierName    string // kosong berarti memakai kurir dari checkout
}

// contact berisi data untuk email notifikasi.
type contact struct {
	Email string
	Name  string
}

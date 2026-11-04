package order

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"hii-stranger1/backend/internal/app/api/product"
)

const (
	uniqueViolation = "23505"

	orderColumns = `id, order_number, user_id, recipient_name, recipient_phone, shipping_address,
		shipping_city, shipping_kelurahan, subtotal::text, shipping_cost::text, total_amount::text, order_status,
		shipping_province, shipping_district, shipping_subdistrict_id, shipping_zip_code,
		courier_code, courier_service, shipping_etd, shipping_weight_gram`

	itemColumns = `id, order_id, product_id, variant_id, product_name, size, unit_price::text, quantity, subtotal::text`

	itemsQuery = "SELECT " + itemColumns + " FROM order_items WHERE order_id = $1 ORDER BY product_name, size, id"

	// unitPrice adalah harga satuan setelah diskon (sama dengan rumus di cart).
	unitPrice = `ROUND(p.price * (100 - p.discount_percent) / 100, 2)`
)

// Repository mengakses tabel orders dan order_items.
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository membuat Repository di atas pool koneksi.
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// cartLine adalah satu item keranjang yang dibaca saat checkout.
type cartLine struct {
	CartItemID    string
	VariantID     string
	Quantity      int
	Stock         int
	Size          string
	ProductID     string
	ProductName   string
	ProductStatus string
	UnitPrice     string
	Subtotal      string
	WeightGram    int // berat produk x jumlah
}

// Checkout membuat order dari keranjang dalam SATU transaksi: kunci item &
// varian, cek stok, simpan order + item (snapshot), kurangi stok, lalu hapus
// item keranjang yang dipakai. Bila satu langkah gagal, semuanya dibatalkan.
// ship berisi ongkir yang sudah dihitung service untuk berat ship.WeightGram.
func (r *Repository) Checkout(ctx context.Context, userID, orderNumber string, ship shipping, in CheckoutInput) (Order, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return Order{}, wrap("checkout begin", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	lines, err := lockCartLines(ctx, tx, userID, in.CartItemIDs)
	if err != nil {
		return Order{}, err
	}
	if len(lines) == 0 {
		return Order{}, ErrCartEmpty
	}
	if len(in.CartItemIDs) > 0 && len(lines) != len(in.CartItemIDs) {
		return Order{}, ErrCartItemNotFound
	}

	// Hitung kebutuhan stok per varian (satu varian bisa muncul lebih dari
	// sekali di keranjang) sekaligus subtotal order.
	need := map[string]int{}
	subtotal := new(big.Rat)
	cartIDs := make([]string, 0, len(lines))
	weight := 0
	for _, l := range lines {
		weight += l.WeightGram
		if l.ProductStatus != product.StatusActive {
			return Order{}, ErrProductUnavailable
		}
		need[l.VariantID] += l.Quantity
		if need[l.VariantID] > l.Stock {
			return Order{}, ErrInsufficientStock
		}
		sub, ok := new(big.Rat).SetString(l.Subtotal)
		if !ok {
			return Order{}, fmt.Errorf("order: checkout: subtotal %q tidak valid", l.Subtotal)
		}
		subtotal.Add(subtotal, sub)
		cartIDs = append(cartIDs, l.CartItemID)
	}

	// Ongkir dihitung dari berat sebelum transaksi; bila keranjang berubah di
	// sela waktu itu, tolak supaya pelanggan cek ongkir ulang.
	if weight != ship.WeightGram {
		return Order{}, ErrCartChanged
	}

	cost := ship.Option.Cost
	shippingCost, ok := new(big.Rat).SetString(cost)
	if !ok {
		return Order{}, fmt.Errorf("order: checkout: shipping cost %q tidak valid", cost)
	}
	total := new(big.Rat).Add(subtotal, shippingCost)

	a := ship.Address
	o, err := scanOrder(tx.QueryRow(ctx,
		`INSERT INTO orders
		   (order_number, user_id, recipient_name, recipient_phone, shipping_address,
		    shipping_province, shipping_city, shipping_district, shipping_kelurahan,
		    shipping_subdistrict_id, shipping_zip_code,
		    courier_code, courier_service, shipping_etd, shipping_weight_gram,
		    subtotal, shipping_cost, total_amount, order_status)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
		         $16::numeric, $17::numeric, $18::numeric, $19)
		 RETURNING `+orderColumns,
		orderNumber, userID, in.RecipientName, in.RecipientPhone, in.ShippingAddress,
		a.Province, a.City, a.District, a.Subdistrict,
		a.SubdistrictID, nullIfEmpty(a.ZipCode),
		ship.Option.CourierCode, ship.Option.Service, nullIfEmpty(ship.Option.ETD), ship.WeightGram,
		subtotal.FloatString(2), cost, total.FloatString(2), StatusPendingPayment))
	if err != nil {
		return Order{}, wrap("checkout insert order", err)
	}

	for _, l := range lines {
		_, err := tx.Exec(ctx,
			`INSERT INTO order_items
			   (order_id, product_id, variant_id, product_name, size, unit_price, quantity, subtotal)
			 VALUES ($1, $2, $3, $4, $5, $6::numeric, $7, $8::numeric)`,
			o.ID, l.ProductID, l.VariantID, l.ProductName, l.Size, l.UnitPrice, l.Quantity, l.Subtotal)
		if err != nil {
			return Order{}, wrap("checkout insert item", err)
		}
	}

	for variantID, qty := range need {
		if _, err := tx.Exec(ctx,
			`UPDATE product_variants SET stock = stock - $2 WHERE id = $1`, variantID, qty); err != nil {
			return Order{}, wrap("checkout reduce stock", err)
		}
	}

	if _, err := tx.Exec(ctx,
		`DELETE FROM cart_items WHERE id = ANY($1::uuid[])`, cartIDs); err != nil {
		return Order{}, wrap("checkout clear cart", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return Order{}, wrap("checkout commit", err)
	}
	return o, nil
}

// lockCartLines membaca item keranjang user (semua, atau hanya ids bila
// diisi) dan mengunci baris item serta variannya sampai transaksi selesai,
// supaya stok tidak diambil checkout lain secara bersamaan.
func lockCartLines(ctx context.Context, tx pgx.Tx, userID string, ids []string) ([]cartLine, error) {
	query := `SELECT ci.id, v.id, ci.quantity, v.stock, v.size, p.id, p.name, p.status,
	                 ` + unitPrice + `::text, (` + unitPrice + ` * ci.quantity)::text,
	                 p.weight_gram * ci.quantity
	            FROM cart_items ci
	            JOIN product_variants v ON v.id = ci.variant_id
	            JOIN products p ON p.id = v.product_id
	           WHERE ci.user_id = $1`
	args := []any{userID}
	if len(ids) > 0 {
		query += ` AND ci.id = ANY($2::uuid[])`
		args = append(args, ids)
	}
	// Urutan tetap (per varian) mencegah deadlock antar transaksi checkout.
	query += ` ORDER BY v.id, ci.id FOR UPDATE OF ci, v`

	rows, err := tx.Query(ctx, query, args...)
	if err != nil {
		return nil, wrap("checkout lock cart", err)
	}
	defer rows.Close()

	var lines []cartLine
	for rows.Next() {
		var l cartLine
		if err := rows.Scan(&l.CartItemID, &l.VariantID, &l.Quantity, &l.Stock, &l.Size,
			&l.ProductID, &l.ProductName, &l.ProductStatus, &l.UnitPrice, &l.Subtotal, &l.WeightGram); err != nil {
			return nil, wrap("checkout scan cart", err)
		}
		lines = append(lines, l)
	}
	if err := rows.Err(); err != nil {
		return nil, wrap("checkout cart rows", err)
	}
	return lines, nil
}

// List mengambil satu halaman order yang cocok dengan f beserta totalnya,
// terbaru lebih dulu (nomor order diawali tanggal & jam pembuatan).
func (r *Repository) List(ctx context.Context, f Filter, limit, offset int) ([]Order, int, error) {
	var conds []string
	var args []any
	add := func(cond string, v any) {
		args = append(args, v)
		conds = append(conds, fmt.Sprintf(cond, len(args)))
	}
	if f.UserID != "" {
		add("user_id = $%d", f.UserID)
	}
	if f.Status != "" {
		add("order_status = $%d", f.Status)
	}
	if f.OrderNumber != "" {
		add("order_number = $%d", f.OrderNumber)
	}
	where := ""
	if len(conds) > 0 {
		where = " WHERE " + strings.Join(conds, " AND ")
	}

	// Total dan halaman diambil dalam satu perjalanan ke database (pgx.Batch).
	pageArgs := append(append([]any{}, args...), limit, offset)
	b := &pgx.Batch{}
	b.Queue("SELECT COUNT(*) FROM orders"+where, args...)
	b.Queue(fmt.Sprintf("SELECT %s FROM orders%s ORDER BY order_number DESC LIMIT $%d OFFSET $%d",
		orderColumns, where, len(pageArgs)-1, len(pageArgs)), pageArgs...)
	br := r.db.SendBatch(ctx, b)
	defer br.Close()

	var total int
	if err := br.QueryRow().Scan(&total); err != nil {
		return nil, 0, wrap("count", err)
	}
	rows, err := br.Query()
	if err != nil {
		return nil, 0, wrap("list", err)
	}
	out, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (Order, error) { return scanOrder(row) })
	if err != nil {
		return nil, 0, wrap("list scan", err)
	}
	if out == nil {
		out = []Order{}
	}
	return out, total, nil
}

// Items mengambil seluruh item order.
func (r *Repository) Items(ctx context.Context, orderID string) ([]Item, error) {
	rows, err := r.db.Query(ctx, itemsQuery, orderID)
	if err != nil {
		return nil, wrap("items", err)
	}
	return collectItems(rows)
}

// GetWithItems mengambil order beserta itemnya dalam satu perjalanan ke
// database (pgx.Batch). ErrNotFound bila order tidak ada.
func (r *Repository) GetWithItems(ctx context.Context, id string) (Order, []Item, error) {
	b := &pgx.Batch{}
	b.Queue("SELECT "+orderColumns+" FROM orders WHERE id = $1", id)
	b.Queue(itemsQuery, id)
	br := r.db.SendBatch(ctx, b)
	defer br.Close()

	o, err := scanOrder(br.QueryRow())
	if err != nil {
		return Order{}, nil, wrap("get with items", err)
	}
	rows, err := br.Query()
	if err != nil {
		return Order{}, nil, wrap("get with items", err)
	}
	items, err := collectItems(rows)
	if err != nil {
		return Order{}, nil, err
	}
	return o, items, nil
}

// collectItems membaca baris order_items menjadi slice (tidak pernah nil).
func collectItems(rows pgx.Rows) ([]Item, error) {
	out, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (Item, error) {
		var it Item
		err := row.Scan(&it.ID, &it.OrderID, &it.ProductID, &it.VariantID, &it.ProductName,
			&it.Size, &it.UnitPrice, &it.Quantity, &it.Subtotal)
		return it, err
	})
	if err != nil {
		return nil, wrap("items scan", err)
	}
	if out == nil {
		out = []Item{}
	}
	return out, nil
}

// UpdateStatus mengubah status order bila transisinya diizinkan. Saat order
// dibatalkan, stok setiap varian dikembalikan dalam transaksi yang sama.
// onUpdate (boleh nil) dijalankan di transaksi yang sama setelah status
// berubah, misalnya untuk menyimpan resi; bila gagal, semuanya dibatalkan.
func (r *Repository) UpdateStatus(ctx context.Context, id, to string, onUpdate func(context.Context, pgx.Tx, Order) error) (Order, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return Order{}, wrap("update status begin", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var from string
	err = tx.QueryRow(ctx, `SELECT order_status FROM orders WHERE id = $1 FOR UPDATE`, id).Scan(&from)
	if errors.Is(err, pgx.ErrNoRows) {
		return Order{}, ErrNotFound
	}
	if err != nil {
		return Order{}, wrap("update status lock", err)
	}
	if !canTransition(from, to) {
		return Order{}, ErrInvalidTransition
	}

	if to == StatusCancelled {
		// Dijumlah per varian dulu: UPDATE ... FROM hanya memakai satu baris
		// pasangan per target, jadi item ganda tidak boleh dibiarkan terpisah.
		_, err := tx.Exec(ctx,
			`UPDATE product_variants v
			    SET stock = v.stock + s.qty
			   FROM (SELECT variant_id, SUM(quantity) AS qty
			           FROM order_items WHERE order_id = $1
			          GROUP BY variant_id) s
			  WHERE v.id = s.variant_id`, id)
		if err != nil {
			return Order{}, wrap("update status restore stock", err)
		}
	}

	o, err := scanOrder(tx.QueryRow(ctx,
		"UPDATE orders SET order_status = $2 WHERE id = $1 RETURNING "+orderColumns, id, to))
	if err != nil {
		return Order{}, wrap("update status", err)
	}
	if onUpdate != nil {
		if err := onUpdate(ctx, tx, o); err != nil {
			return Order{}, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return Order{}, wrap("update status commit", err)
	}
	return o, nil
}

// contactOf mengambil email & nama pemilik order untuk notifikasi.
func (r *Repository) contactOf(ctx context.Context, orderID string) (contact, error) {
	var c contact
	err := r.db.QueryRow(ctx,
		`SELECT u.email, u.name FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = $1`,
		orderID).Scan(&c.Email, &c.Name)
	if err != nil {
		return contact{}, fmt.Errorf("order: contact: %w", err)
	}
	return c, nil
}

func scanOrder(row pgx.Row) (Order, error) {
	var o Order
	err := row.Scan(&o.ID, &o.OrderNumber, &o.UserID, &o.RecipientName, &o.RecipientPhone,
		&o.ShippingAddress, &o.ShippingCity, &o.ShippingKelurahan, &o.Subtotal, &o.ShippingCost,
		&o.TotalAmount, &o.OrderStatus,
		&o.ShippingProvince, &o.ShippingDistrict, &o.ShippingSubdistrictID, &o.ShippingZipCode,
		&o.CourierCode, &o.CourierService, &o.ShippingETD, &o.ShippingWeightGram)
	if errors.Is(err, pgx.ErrNoRows) {
		return Order{}, ErrNotFound
	}
	return o, err
}

// nullIfEmpty mengubah string kosong menjadi NULL di database.
func nullIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// wrap menambahkan konteks operasi tetapi membiarkan error domain tetap utuh.
func wrap(op string, err error) error {
	if errors.Is(err, ErrNotFound) {
		return err
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == uniqueViolation && pgErr.ConstraintName == "uq_orders_order_number" {
		return errDuplicateNumber
	}
	return fmt.Errorf("order: %s: %w", op, err)
}

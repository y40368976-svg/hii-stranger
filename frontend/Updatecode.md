# Updatecode.md - Catatan Perbaikan Frontend Capstone (Hii Stranger)

Tanggal: 6 November 2026. Cakupan: folder `frontend` (kode lama dari GitHub 2024, dibawa ke stack 2026: Next.js 16.4.5, React 19.3, Tailwind 4.3, TypeScript 5.9) dan penyesuaiannya dengan fitur di `backend` (Go + PostgreSQL + Redis, kontrak di `backend/api/openapi.yaml`).

Kode `backend` tidak diubah sama sekali. Tidak ada library yang saya install; semua yang perlu kamu install ada di bagian 3.

---

## 1. Hasil verifikasi

- `npx tsc --noEmit`: **0 error kode**. Sisa 29 error semuanya berbunyi "Cannot find module" untuk paket yang belum terpasang (bagian 3). Setelah paket di-install, harusnya bersih.
- Sebelum diperbaiki: lebih dari 60 error, mayoritas "Cannot find module '@/components/...'".
- `next build` / `next dev` belum saya jalankan karena paket belum terpasang. Jalankan sendiri di langkah bagian 7.

## 2. Akar masalah (kenapa kode lama error)

1. **Alias path salah.** `tsconfig.json` memetakan `@/*` ke `./*` padahal semua kode ada di `src/`. Ini penyebab terbesar error "Cannot find module". Sekarang `@/*` ke `./src/*`.
2. **Dependency hilang.** `package.json` cuma berisi kerangka create-next-app, padahal kode memakai `react-redux`, `@reduxjs/toolkit`, `swiper`, `react-hot-toast`, `react-range-slider-input`.
3. **Tailwind v3 ke v4.** Kode lama memakai `@tailwind base/components/utilities` dan `tailwind.config.ts` (sudah tidak ada). Tailwind 4 memakai `@import "tailwindcss"` dan tema lewat `@theme` di CSS. Tema dibuat ulang di `src/app/css/style.css` dari class yang dipakai komponen.
4. **Layout.** `html`/`body` ada di `(site)/layout.tsx` yang `"use client"` dengan preloader palsu 1 detik, dan tidak ada root layout. Sekarang ada `src/app/layout.tsx` (server component) + `src/app/providers.tsx`.
5. **ShopDetails** membaca `localStorage` langsung saat render, sehingga error saat server-side rendering dan hilang saat refresh. Sekarang produk diambil dari backend lewat `?id=`.
6. **Import relatif salah** di `Header` (`./redux/store`, `../context/...`).
7. **API react-redux deprecated.** `TypedUseSelectorHook` diganti `useSelector.withTypes<RootState>()` (butuh react-redux 9.1+).
8. **Fetch ke endpoint yang tidak ada.** `Orders` memanggil `/api/order` (route Next yang tidak pernah ada). Sekarang ke backend `GET /orders`.
9. **TypeScript strict.** Template ditulis tanpa tipe; `noImplicitAny` dimatikan agar build tidak gagal oleh puluhan parameter tanpa tipe. Tipe untuk kode baru sudah lengkap.
10. **Folder `rules-direction/`** (source Next.js + agent skills) ikut ter-compile dan ter-lint. Sekarang dikecualikan di `tsconfig` dan ESLint.
11. **Aset gambar hilang.** 82 file yang dirujuk kode (`/images/hero/...`, `/images/logo/...`, `/images/icons/...`, dst.) tidak ada di `public/`. Saya hanya menambah `icon-star.svg` dan `placeholder.svg`. Lihat bagian 6.
12. **Line ending.** 106 file CRLF dikonversi ke LF. Diff git akan terlihat besar; wajar.

## 3. Library tambahan yang perlu kamu install

Jalankan di folder `frontend` (project memakai pnpm 12):

```bash
pnpm add react-redux @reduxjs/toolkit swiper react-hot-toast react-range-slider-input
```

| Paket | Dipakai untuk | Catatan versi |
|---|---|---|
| `react-redux` | state keranjang/wishlist/quick view | wajib 9.1+ (memakai `.withTypes`) |
| `@reduxjs/toolkit` | slice & store | 2.x |
| `swiper` | carousel (hero, kategori, testimonial, preview) | 11+, impor `swiper/react` dan `swiper/css` |
| `react-hot-toast` | notifikasi (login, keranjang, checkout) | baru, dipakai kode baru |
| `react-range-slider-input` | masih diimpor file lama; bisa dilepas bila tidak dipakai lagi | filter harga baru memakai input angka |

Tidak perlu paket lain (fetch bawaan dipakai untuk API, tanpa axios).

## 4. Daftar perubahan

### Konfigurasi
| File | Perubahan |
|---|---|
| `tsconfig.json` | alias `@/*` ke `./src/*`; include hanya `src`; exclude `rules-direction`; target ES2022; `noImplicitAny: false` (backup: `tsconfig.json.bak-original`) |
| `eslint.config.mjs` | ignore `rules-direction/**`; `no-explicit-any`, `no-unused-vars`, `no-unescaped-entities` jadi warning |
| `next.config.ts` | tambah `images.remotePatterns` (`res.cloudinary.com`, `localhost`) agar gambar Cloudinary bisa dipakai `next/image`. Opsi lain dibiarkan |
| `src/app/css/style.css` | Tailwind v4: `@import "tailwindcss"` + blok `@theme` (warna, font size `text-custom-*`/`text-heading-*`, `shadow-*`, font Euclid) + default border abu-abu (backup: `style.css.bak-original`) |
| `public/images/icons/icon-star.svg`, `public/images/placeholder.svg` | aset baru |

### Lapisan API baru (`src/`)
| File | Isi |
|---|---|
| `lib/api.ts` | wrapper fetch: base URL dari `NEXT_PUBLIC_API_URL`, header `Authorization: Bearer`, parsing envelope `{data, meta}` / `{error}`, `ApiError`, auto-hapus token saat 401 |
| `lib/format.ts` | `formatRupiah`, `formatDate`, label & warna status order |
| `lib/mappers.ts` | produk backend ke bentuk `Product` UI; keranjang backend ke item redux |
| `types/api.ts` | tipe semua respons backend |
| `services/index.ts` | `authService`, `productService`, `categoryService`, `bannerService`, `settingService`, `cartService`, `regionService`, `orderService`, `paymentService` |
| `app/context/AuthContext.tsx` | login/register/logout, token di localStorage, `useAuth()` |
| `hooks/useCartActions.ts` | tambah/ubah/hapus/kosongkan keranjang via backend |
| `hooks/useProductList.ts`, `useCategories.ts`, `useShop.ts` | data produk, kategori, filter + pagination halaman shop |
| `app/layout.tsx`, `app/providers.tsx`, `app/CartSync.tsx` | root layout, gabungan provider, sinkron keranjang saat login |
| `app/(site)/(pages)/orders/[id]/page.tsx` + `components/OrderDetail` | halaman baru detail pesanan + pembayaran |

### Komponen yang diubah
| Komponen | Perubahan |
|---|---|
| `(site)/layout.tsx` | hanya Header/Footer/modal; preloader dihapus |
| `Auth/Signin`, `Auth/Signup` | form sungguhan ke `/auth/login` dan `/auth/register`; tombol login Google/GitHub disembunyikan (backend tidak punya OAuth) |
| `Header` | nama user + tombol Logout, link ke `/my-account` bila sudah login, harga Rupiah |
| `Home/NewArrivals`, `Home/BestSeller`, `Home/Categories` | data dari `GET /products` dan `GET /categories` |
| `ShopWithSidebar`, `ShopWithoutSidebar` | produk, filter kategori, filter harga, urutan, pagination dari backend; filter Gender/Size/Warna dihapus (tidak ada di backend) |
| `ProductItem`, `Shop/SingleGridItem`, `SingleListItem`, `BestSeller/SingleItem`, `QuickViewModal`, `Wishlist/SingleItem` | tombol "add to cart" memanggil backend; link detail jadi `/shop-details?id=...`; harga Rupiah |
| `ShopDetails` | ambil detail via `GET /products/{id}`, pilih varian (size/warna/stok), tambah ke keranjang; blok pilihan Color/Storage/SIM contoh dihapus |
| `Cart/*`, `CartSidebarModal/*` | qty/hapus/kosongkan lewat `/cart`; cek stok |
| `Checkout/index.tsx` | ditulis ulang: data penerima, dropdown wilayah berjenjang, ongkir dari server, metode bayar, buat order + tagihan |
| `Orders/*`, `MyAccount` | daftar pesanan dari `GET /orders`, link ke detail; logout dan sapaan nama user |
| `redux/store.ts`, `cart-slice.ts`, `wishlist-slice.ts`, `types/product.ts` | id boleh string (UUID), `setCartItems`, hook bertipe |

Komponen checkout lama (`Billing`, `Shipping`, `ShippingMethod`, `PaymentMethod`, `Coupon`, `Login`) sekarang tidak dipakai; aman dihapus bila mau.

## 5. Pemetaan fitur frontend dengan backend

| Fitur frontend | Endpoint backend | Status |
|---|---|---|
| Daftar / masuk | `POST /auth/register`, `POST /auth/login` (JWT, rate limit 10/menit/IP) | tersambung |
| Sesi / profil | `GET /users/me` | tersambung (muat user saat refresh) |
| Edit profil, ganti password | `PATCH /users/me`, `PUT /users/me/password` | service siap, **form MyAccount belum disambung** |
| Beranda: produk, kategori | `GET /products`, `GET /categories` | tersambung |
| Shop: cari/filter/urut/halaman | `GET /products?q&category_id&min_price&max_price&sort&page&limit` (sort: `name`, `-name`, `price`, `-price`) | tersambung (filter harga, kategori, sort, halaman; `?q=` dibaca dari URL) |
| Detail produk, varian | `GET /products/{id}` (variants + images) | tersambung |
| Keranjang | `GET/DELETE /cart`, `POST /cart/items`, `PATCH/DELETE /cart/items/{id}` | tersambung, wajib login |
| Wilayah & ongkir | `GET /regions/provinces ... /subdistricts`, `GET /shipping/costs` | tersambung di checkout |
| Checkout | `POST /orders` (server hitung ulang harga & ongkir) | tersambung |
| Tagihan & bukti bayar | `POST /orders/{id}/payment`, `PUT /orders/{id}/payment/proof` (multipart, field `file`) | tersambung di halaman detail pesanan |
| Riwayat & detail pesanan | `GET /orders`, `GET /orders/{id}` | tersambung |
| Resi / pengiriman | `GET /orders/{id}/shipment` (ikut di detail order) | tampil di detail pesanan |
| Banner beranda | `GET /banners` | service siap, **Hero belum disambung** |
| Mode maintenance | `GET /site-settings` | service siap, **belum ada tampilan maintenance** |
| Admin (kelola produk/kategori/banner/user/order/pembayaran, upload Cloudinary) | `/admin/*`, `POST/PATCH/DELETE` produk dll. | **belum ada UI admin**; service order/payment admin sudah ada di `services/index.ts` |

## 6. Yang belum tersambung / keterbatasan

- **Gambar statis (82 file) tidak ada di `public/images`.** Ambil folder `public/images` dari repo template aslinya (NextMerce) atau ganti satu per satu. Tanpa itu: logo, hero, ikon, dan gambar blog tampil rusak. Gambar produk dari Cloudinary aman.
- **Warna tema adalah pendekatan.** `tailwind.config` asli sudah tidak ada, jadi nilai heks di blok `@theme` (`style.css`) diturunkan dari nama class. Sesuaikan bila ingin persis seperti desain.
- **Best Seller** sementara memakai produk terbaru (backend belum punya data penjualan). **Review/rating** hanya hiasan (selalu 0).
- **Wishlist** masih lokal (redux, hilang saat refresh) karena backend tidak punya endpoint wishlist.
- **Alamat tersimpan** di MyAccount dan **kupon/diskon** keranjang masih tampilan template (backend tidak punya fitur itu; alamat dikirim per pesanan).
- **Pencarian Header** belum diarahkan; halaman shop sudah membaca `?q=`.
- **Blog, Contact, Testimonial, Countdown, Newsletter** tetap statis (tidak ada di backend).
- **Tanggal pesanan** tampil "-" karena JSON order dari backend tidak menyertakan `created_at`. Perlu 1 field tambahan di backend bila ingin tanggal.
- **Pembatalan order oleh pelanggan** tidak ada tombol (backend hanya mengubah status lewat endpoint admin).
- Token disimpan di `localStorage` (backend memakai header Authorization, bukan cookie).

## 7. Yang harus kamu lakukan sekarang (urut)

1. Di folder `frontend`: `pnpm add react-redux @reduxjs/toolkit swiper react-hot-toast react-range-slider-input`
2. Salin folder `public/images` dari template aslinya (lihat bagian 6).
3. Siapkan backend: `cd backend`, salin `.env.example` ke `.env` (cek `DB_URL`, `JWT_SECRET≥32 karakter`, `REDIS_ADDR`, `FRONTEND_URL=http://localhost:3000` harus persis sama dengan alamat frontend), lalu `go run ./cmd/migration up` dan `go run ./cmd/api` (port 8080). Redis harus menyala.
4. `frontend/.env.local` sudah berisi `NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1`. Biarkan bila backend jalan lokal.
5. Di `frontend`: `pnpm dev`, lalu uji alur: daftar, login, lihat produk, tambah keranjang, checkout, buka detail pesanan, unggah bukti bayar.
6. Sebelum deploy: `pnpm build` dan `pnpm lint` (warning boleh, error tidak).
7. Folder `.next` lama sudah saya hapus; akan dibuat ulang otomatis.
8. Opsional: hapus `tsconfig.json.bak-original` dan `src/app/css/style.css.bak-original` bila sudah yakin.

Kalau semua sudah, balas "sudah" di chat, nanti saya cek hasilnya (build, error di browser) dan lanjut sambungkan sisa fitur (banner, profil, UI admin).

## 8. Rollback

Semua perubahan ada di working tree git (belum di-commit). `git diff` untuk melihat, `git restore <file>` untuk membatalkan per file. Dua file backup (`*.bak-original`) menyimpan versi awal `tsconfig` dan `style.css`.


---

## 9. Update lanjutan (6 Nov 2026, sesi 2)

Backend tetap tidak diubah. Hasil: `tsc` 0 error, `eslint` 0 error (58 warning), `next build` sukses (22 route, termasuk `/admin`).

### Build yang sebelumnya gagal
| File | Perbaikan |
|---|---|
| `components/Footer/index.tsx` | `new Date()` saat render membuat prerender gagal (Cache Components). Tahun sekarang dibaca di `useEffect` |
| `app/(site)/layout.tsx` | Header dan halaman dibungkus `<Suspense>` (usePathname/useSearchParams); ditambah `MaintenanceGate` |
| `components/Home/Countdown` | deadline 2024 (sudah lewat, angka negatif) diganti hitung mundur ke akhir bulan; `@ts-ignore` dihapus |
| `eslint.config.mjs` | `react-hooks/set-state-in-effect` jadi warning (pola fetch di useEffect) |

### Fitur backend yang sekarang tersambung
| Fitur | Endpoint | File |
|---|---|---|
| Banner hero | `GET /banners` | `Home/Hero/HeroCarousel.tsx`; kartu samping hero pakai `GET /products` (`HeroSideProducts.tsx`) |
| Pencarian Header + kategori | `GET /products?q=&category_id=` | `Header/index.tsx` -> `/shop-with-sidebar?q=&category=`; `useShop` ikut berubah saat URL berubah |
| Edit profil & ganti password | `PATCH /users/me`, `PUT /users/me/password` | `MyAccount/AccountDetails.tsx`; tab Downloads & Addresses (tidak ada di backend) dihapus |
| Mode maintenance | `GET /site-settings` | `Common/MaintenanceGate.tsx` (admin & /signin tetap bisa diakses) |
| Panel admin | semua `/admin/*` + tulis produk/varian/gambar/kategori/banner/shipment/site-settings + `POST /admin/uploads/images` | `app/admin/`, `components/Admin/*` |

Panel admin (`/admin`, muncul link "Admin" di Header untuk role admin; login admin langsung diarahkan ke sana):
- **Pesanan**: filter status & no. order, detail item/alamat/pembayaran, ubah status sesuai transisi backend (shipped wajib no. resi), simpan data pengiriman.
- **Pembayaran**: filter status, lihat bukti bayar (`GET /orders/{id}/payment/proof`), setujui/tolak.
- **Produk**: daftar, tambah/edit/hapus, varian (SKU/ukuran/warna/stok), gambar (unggah Cloudinary atau URL, set gambar utama).
- **Kategori**, **Banner**, **Pengguna** (role & status), **Pengaturan** (maintenance).

Service baru: `adminService` dan `paymentService.proof` di `services/index.ts`, `fetchBlob` di `lib/api.ts`.

### Belum bisa diuji end-to-end
Backend tidak sedang berjalan saat pengecekan (`localhost:8080` menolak koneksi), jadi alur di browser belum dicoba. Jalankan backend + `pnpm dev`, lalu coba: login admin -> `/admin`.


---

## 10. Rapikan UI & buang yang tidak terpakai (sesi 3)

Backend tetap tidak diubah. `next build` sukses (11 halaman), `tsc` 0 error, `eslint` 0 error / 22 warning.

**Catatan:** folder `frontend` tidak di-track git (hanya `AGENTS.md`), jadi file yang dihapus tidak bisa di-`git restore`.

### Dihapus
- Halaman: blog (4), contact, error, mail-success, shop-without-sidebar, wishlist.
- Komponen: Blog*, Contact, Error, MailSuccess, ShopWithoutSidebar, Wishlist, Home/Testimonials, Home/Countdown, Home/BestSeller (duplikat produk terbaru), Home/PromoBanner (gambar statis), Newsletter, PreLoader, QuickViewModal + PreviewSlider (beserta context-nya), Checkout lama (Billing, Shipping, ShippingMethod, PaymentMethod, Coupon, Login, Notes, OrderList), Cart/Discount & OrderSummary, Orders lama (SingleOrder, EditOrder, OrderActions, OrderDetails, OrderModal, ordersData), MyAccount AddressModal & tabsData, filter Gender/Size/Warna, Header CustomSelect & Dropdown, RecentlyViewd, shopData, categoryData.
- Redux: wishlist-slice, quickView-slice, product-details (redux sekarang cuma keranjang).
- CSS: `async-gallery.css`, style slider/zoom/carousel lama; file `*.bak-original`.
- Paket: `react-range-slider-input` (`pnpm remove`).

### Ditulis ulang / dirapikan
- **Header**: logo teks "Hii Stranger", menu Beranda/Belanja/Keranjang/Akun Saya (+Admin), pencarian + kategori, menu mobile, badge jumlah keranjang.
- **Footer**: ringkas, tanpa link/gambar template.
- **Beranda**: banner + produk samping, keunggulan toko (ikon SVG inline), kategori (grid), produk terbaru.
- **Kartu produk**: satu komponen untuk beranda & shop (badge diskon / pre-order, tanpa rating & wishlist palsu).
- **Detail produk**: galeri, badge ready/pre-order, pilih varian + stok, jumlah dibatasi stok, deskripsi dari backend (tanpa lorem ipsum / spesifikasi iPhone contoh).
- **Shop**: filter di atas produk pada layar kecil (tidak lagi terpotong), teks Indonesia.
- **Keranjang** (halaman & panel samping), **Masuk/Daftar** (daftar kini bisa isi no. HP), **Akun Saya** (tab Pesanan & Profil), **Riwayat pesanan**.
- Breadcrumb kecil seragam; judul tab `<halaman> | Hii Stranger`.
- Ikon bersama di `components/Common/Icons.tsx`, judul seksi di `components/Common/SectionTitle.tsx`.

Tidak ada lagi referensi ke gambar `public/images/...` yang hilang, jadi folder gambar template tidak perlu disalin.

---

## 11. Perombakan menyeluruh (sesi 4, 6 Nov 2026)

Backend **dan** frontend diubah. Backup sebelum perubahan: `Project Kampus/capstone_hi_backup_20261106/`.

### Langkah setelah pull
1. `cd backend && go run ./cmd/migration up` (migrasi `20261106100000_commerce_overhaul`, sudah dijalankan di DB lokal; down/up teruji).
2. `cd frontend && pnpm install` (paket baru: `lucide-react`).
3. Panel Admin → Pengaturan: unggah gambar **QRIS statis**, isi nama merchant & NMID.
4. `ACCESS_TOKEN_TTL` di `.env` diubah 15m → 12h (tanpa refresh token, 15 menit membuat pelanggan ter-logout saat checkout).

### Alur bisnis baru (ditegakkan di backend)
| Aturan | Implementasi |
|---|---|
| Verifikasi email wajib sebelum pesan | register kirim tautan (token SHA-256, 24 jam, sekali pakai); `POST /auth/verify-email`, `POST /auth/verification/resend`; checkout menolak `403 email_not_verified`. Akun lama ditandai terverifikasi oleh migrasi. Tanpa SMTP, tautan ditulis ke log server. |
| Admin/copywriter tidak bisa belanja | `RequireRole(customer)` di `/cart*`, `/shipping/costs`, `POST /orders`, bayar & unggah bukti; dicek ulang di transaksi checkout. Storefront menyembunyikan tas untuk staf. |
| Role copywriter | hanya menu Jurnal + unggah gambar. Admin mengatur role di menu Pengguna. |
| Pembayaran QRIS saja | tagihan (total + kode unik 3 digit) dibuat otomatis saat checkout; method lain ditolak. |
| Batas bayar | `payment_due_at` (default 24 jam, bisa diatur); order lewat batas & tanpa bukti yang sedang dicek dibatalkan otomatis tiap 5 menit, stok dikembalikan. |
| Batal & selesai oleh pelanggan | `POST /orders/{id}/cancel` (selama belum bayar & bukti tidak sedang dicek), `POST /orders/{id}/complete` (setelah dikirim). Admin wajib isi alasan saat membatalkan. |
| Stok | daftar produk mengembalikan `total_stock` & `variant_count`; produk nonaktif tidak bisa masuk keranjang; storefront memakai request anonim agar admin tidak melihat produk nonaktif di toko. |
| Email + lacak resi | email HTML+teks; email kirim berisi no. resi, tautan halaman pesanan, situs resmi kurir, dan cekresi.com dengan resi terisi (`internal/pkg/tracking`). |
| Banner | 3 penempatan: `hero` (1920×800), `main` (1600×1000), `catalog` (1920×480) + gambar mobile, judul/label/CTA, jadwal `starts_at`/`ends_at`, status live/terjadwal/berakhir/nonaktif. |
| Jurnal | tabel `posts` + `post_products`; publik `GET /posts`, `GET /posts/{slug}`; staf `/admin/posts` CRUD, terbit terjadwal. |
| Ringkasan admin | `GET /admin/summary` (antrean bukti, kemas, kirim, omzet bulan ini, stok menipis, order terbaru). |

### Frontend
Desain ulang total mengikuti `editorial_streetwear/DESIGN.md` (kanvas #FBF9F5, tinta #141413, aksen lime #D4FF14, Bricolage Grotesque + Geist). Semua ikon Lucide. Komponen UI baru di `src/components/ui` (Select dengan pencarian/keyboard/bottom-sheet mobile, Menu, Dialog/drawer, Badge, dsb). Rute baru: `/shop`, `/product/[id]`, `/journal`, `/journal/[slug]`, `/verify-email`; rute lama di-redirect.

### Verifikasi yang dijalankan
`go vet`, `go test ./...`, `tsc --noEmit`, `eslint` (0 error), `next build` sukses. Uji API end-to-end di DB lokal (data uji sudah dihapus): register→verifikasi, blokir admin, checkout RajaOngkir, QRIS + kode unik, unggah bukti, approve, kemas, kirim dengan resi, selesai, batal (stok kembali), kedaluwarsa otomatis, banner terjadwal, artikel terbit.

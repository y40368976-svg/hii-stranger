# Hasil Testing Backend Hii Stranger

Dijalankan 05 November 2026, 00:40 WIB · server asli + PostgreSQL lokal + layanan pihak ketiga · [lihat benchmark](#bench)

Skenario lolos

130 / 130

Endpoint dites

55

Kelompok fitur

14

Rata-rata respons

37 ms

Unit test (go test)

10 paket OK

### Lingkungan & catatan

-   Ongkir asli dari RajaOngkir: POS Pos Reguler Rp 8000 (2 day) Sungai Bambu → Pondok Bambu.
-   Kurir toko hanya POS Indonesia; pelanggan tidak memilih kurir (kurir yang dikirim client diabaikan).
-   Gambar diunggah ke Cloudinary asli; bukti bayar disimpan di database; email dikirim lewat Gmail SMTP.
-   Error/warning di log server selama testing: 0.
-   Termasuk uji cache publik: response kedua dari cache, request bertoken melewati cache, dan data langsung segar setelah admin mengubah produk atau stok berubah karena checkout/batal.
-   Data uji dihapus dari database setelah testing selesai.

 SemuaLolosGagal

## Benchmark performa

-   Alat: bombardier, 64 koneksi bersamaan, 10 detik per endpoint (setelah 3 detik pemanasan), di laptop 4 core yang juga menjalankan PostgreSQL 18.
-   Data: 2.000 produk (6.000 varian, 6.000 gambar), 40 order, keranjang 5 item.
-   **Awal** = pengukuran pertama kode lama. ** Kode lama** = kode lama diukur ulang dengan index database baru dan pool 10 koneksi (pembanding yang adil). ** Sekarang** = kode baru.
-   Baris "(tanpa cache)" memakai token admin sehingga melewati cache dan selalu ke database.
-   Selisih antar-run pada mesin yang sama sekitar ±10%.

| Endpoint | Awal (req/s) | Kode lama | Sekarang | Naik | p99 latency |
| --- | --- | --- | --- | --- | --- |
| health | 8.818 | 28.549 | **21.696** | 0.8× | 9 → 15 ms |
| categories | 3.361 | 7.405 | **35.376** | 4.8× | 17 → 6 ms |
| banners | 5.447 | 11.222 | **34.201** | 3.0× | 15 → 7 ms |
| products list | 299 | 2.190 | **28.001** | 12.8× | 55 → 7 ms |
| products page 50 | 45 | 593 | **28.348** | 47.8× | 183 → 8 ms |
| products search | 285 | 2.098 | **28.385** | 13.5× | 102 → 7 ms |
| product detail | 2.318 | 5.819 | **34.694** | 6.0× | 20 → 7 ms |
| cart | 2.641 | 5.032 | **6.772** | 1.3× | 38 → 28 ms |
| my orders | 1.682 | 2.830 | **4.862** | 1.7× | 49 → 22 ms |
| order detail | 2.366 | 3.599 | **5.010** | 1.4× | 37 → 21 ms |
| admin orders | 2.401 | 4.584 | **5.050** | 1.1× | 27 → 22 ms |
| products list (tanpa cache) | — | 753 | **3.305** | 4.4× | 150 → 33 ms |
| products page 50 (tanpa cache) | — | 192 | **2.482** | 12.9× | 456 → 65 ms |
| products search (tanpa cache) | — | 2.070 | **2.774** | 1.3× | 62 → 40 ms |
| product detail (tanpa cache) | — | 4.595 | **7.620** | 1.7× | 30 → 17 ms |

kode lama sekarang

## Sistem 2/2

| Skenario | Endpoint | Harapan | Hasil | Waktu |
| --- | --- | --- | --- | --- |
| Health check | GET `/health` | 200 | 200 | 16 ms |
| Endpoint tidak dikenal | GET `/tidak-ada` | 404 | 404 | 4 ms |

## Auth & User 15/15

| Skenario | Endpoint | Harapan | Hasil | Waktu |
| --- | --- | --- | --- | --- |
| Register data tidak valid | POST `/auth/register` | 422 | 422 | 14 ms |
| Register customer | POST `/auth/register` | 201 | 201 | 279 ms |
| Register email duplikat | POST `/auth/register` | 409 | 409 | 246 ms |
| Login password salah | POST `/auth/login` | 401 | 401 | 239 ms |
| Login customer | POST `/auth/login` | 200 | 200 | 236 ms |
| Profil sendiri | GET `/users/me` | 200 | 200 | 2 ms |
| Profil tanpa token | GET `/users/me` | 401 | 401 | 2 ms |
| Ubah profil | PATCH `/users/me` | 200 | 200 | 9 ms |
| Ganti password | PUT `/users/me/password` | 200/204 | 204 | 478 ms |
| Login dengan password baru | POST `/auth/login` | 200 | 200 | 235 ms |
| Login admin | POST `/auth/login` | 200 | 200 | 311 ms |
| Customer akses daftar user admin | GET `/admin/users` | 403 | 403 | 2 ms |
| Admin daftar user + pencarian | GET `/admin/users` | 200 | 200 | 7 ms |
| Admin detail user | GET `/admin/users/{id}` | 200 | 200 | 1 ms |
| Admin ubah status user | PATCH `/admin/users/{id}` | 200 | 200 | 5 ms |

## Kategori 6/6

| Skenario | Endpoint | Harapan | Hasil | Waktu |
| --- | --- | --- | --- | --- |
| Buat kategori | POST `/categories` | 201 | 201 | 6 ms |
| Nama kategori duplikat | POST `/categories` | 409 | 409 | 1 ms |
| Daftar kategori | GET `/categories` | 200 | 200 | 4 ms |
| Detail kategori | GET `/categories/{id}` | 200 | 200 | 1 ms |
| Ubah kategori | PATCH `/categories/{id}` | 200 | 200 | 5 ms |
| Hapus kategori | DELETE `/categories/{id}` | 204 | 204 | 9 ms |

## Produk & Varian 12/12

| Skenario | Endpoint | Harapan | Hasil | Waktu |
| --- | --- | --- | --- | --- |
| Buat produk | POST `/products` | 201 | 201 | 11 ms |
| Preorder tanpa estimasi hari | POST `/products` | 422 | 422 | 2 ms |
| Ubah produk | PATCH `/products/{id}` | 200 | 200 | 2 ms |
| Daftar produk + filter & sort | GET `/products` | 200 | 200 | 7 ms |
| Filter status oleh non-admin | GET `/products` | 403 | 403 | 1 ms |
| Buat varian | POST `/products/{id}/variants` | 201 | 201 | 7 ms |
| SKU duplikat | POST `/products/{id}/variants` | 409 | 409 | 2 ms |
| Buat varian kedua | POST `/products/{id}/variants` | 201 | 201 | 4 ms |
| Varian data tidak valid | POST `/products/{id}/variants` | 422 | 422 | 1 ms |
| Ubah stok & kosongkan warna | PATCH `/products/{id}/variants/{id}` | 200 | 200 | 2 ms |
| Hapus varian | DELETE `/products/{id}/variants/{id}` | 204 | 204 | 9 ms |
| Varian tidak ditemukan | PATCH `/products/{id}/variants/{id}` | 404 | 404 | 3 ms |

## Upload & Gambar (Cloudinary) 11/11

| Skenario | Endpoint | Harapan | Hasil | Waktu |
| --- | --- | --- | --- | --- |
| Upload gambar ke Cloudinary | POST `/admin/uploads/images` | 201 | 201 | 1208 ms |
| Upload tipe bukan gambar | POST `/admin/uploads/images` | 415 | 415 | 2 ms |
| Upload bukan multipart | POST `/admin/uploads/images` | 400 | 400 | 3 ms |
| Upload oleh customer | POST `/admin/uploads/images` | 403 | 403 | 1 ms |
| Tambah gambar utama | POST `/products/{id}/images` | 201 | 201 | 5 ms |
| Tambah gambar utama kedua | POST `/products/{id}/images` | 201 | 201 | 3 ms |
| URL gambar tidak valid | POST `/products/{id}/images` | 422 | 422 | 1 ms |
| Detail produk: varian + gambar, hanya 1 utama | GET `/products/{id}` | 200 | 200 | 2 ms |
| Pindah gambar utama | PATCH `/products/{id}/images/{id}` | 200 | 200 | 7 ms |
| Daftar produk memuat primary_image_url | GET `/products` | 200 | 200 | 2 ms |
| Hapus gambar | DELETE `/products/{id}/images/{id}` | 204 | 204 | 2 ms |

## Cache Publik 4/4

| Skenario | Endpoint | Harapan | Hasil | Waktu |
| --- | --- | --- | --- | --- |
| GET publik kedua dilayani dari cache | GET `/products/{id}` | HIT | 200 | 1 ms |
| Request dengan token tidak lewat cache | GET `/products/{id}` | 200 | 200 | 2 ms |
| Setelah admin ubah produk, data publik langsung baru | GET `/products/{id}` | 200 | 200 | 5 ms |
| Sort harga turun memakai angka | GET `/products` | 200 | 200 | 2 ms |

## Banner 7/7

| Skenario | Endpoint | Harapan | Hasil | Waktu |
| --- | --- | --- | --- | --- |
| Buat banner | POST `/banners` | 201 | 201 | 4 ms |
| Daftar banner publik (hanya aktif) | GET `/banners` | 200 | 200 | 3 ms |
| include_inactive tanpa admin | GET `/banners` | 403 | 403 | 2 ms |
| include_inactive oleh admin | GET `/banners` | 200 | 200 | 2 ms |
| Parameter include_inactive salah | GET `/banners` | 400 | 400 | 1 ms |
| Ubah banner (kosongkan link) | PATCH `/banners/{id}` | 200 | 200 | 2 ms |
| Hapus banner | DELETE `/banners/{id}` | 204 | 204 | 2 ms |

## Pengaturan Situs 4/4

| Skenario | Endpoint | Harapan | Hasil | Waktu |
| --- | --- | --- | --- | --- |
| Baca pengaturan | GET `/site-settings` | 200 | 200 | 3 ms |
| Aktifkan maintenance | PUT `/site-settings` | 200 | 200 | 2 ms |
| Pengaturan publik langsung ikut berubah | GET `/site-settings` | 200 | 200 | 5 ms |
| Pesan maintenance kosong | PUT `/site-settings` | 422 | 422 | 1 ms |

## Wilayah (RajaOngkir) 5/5

| Skenario | Endpoint | Harapan | Hasil | Waktu |
| --- | --- | --- | --- | --- |
| Daftar provinsi | GET `/regions/provinces` | 200 | 200 | 184 ms |
| Kota di DKI Jakarta | GET `/regions/provinces/10/cities` | 200 | 200 | 65 ms |
| Kecamatan di Jakarta Timur | GET `/regions/cities/139/districts` | 200 | 200 | 62 ms |
| Kelurahan di Duren Sawit (+ kode pos) | GET `/regions/districts/1357/subdistricts` | 200 | 200 | 129 ms |
| ID wilayah tidak valid | GET `/regions/provinces/abc/cities` | 404 | 404 | 2 ms |

## Keranjang & Ongkir 10/10

| Skenario | Endpoint | Harapan | Hasil | Waktu |
| --- | --- | --- | --- | --- |
| Keranjang kosong | GET `/cart` | 200 | 200 | 7 ms |
| Cek ongkir keranjang kosong | GET `/shipping/costs` | 422 | 422 | 2 ms |
| Tambah item | POST `/cart/items` | 201 | 201 | 6 ms |
| Varian sama digabung (qty 3) | POST `/cart/items` | 201 | 201 | 7 ms |
| Melebihi stok | POST `/cart/items` | 409 | 409 | 2 ms |
| Ubah jumlah item | PATCH `/cart/items/{id}` | 200 | 200 | 3 ms |
| Subtotal (diskon 10%: 90.000 x 3) | GET `/cart` | 200 | 200 | 2 ms |
| Cek ongkir POS (berat 750 g dari keranjang) | GET `/shipping/costs` | 200 | 200 | 174 ms |
| Cek ongkir tanpa login | GET `/shipping/costs` | 401 | 401 | 1 ms |
| Parameter subdistrict_id salah | GET `/shipping/costs` | 400 | 400 | 1 ms |

## Checkout & Order 14/14

| Skenario | Endpoint | Harapan | Hasil | Waktu |
| --- | --- | --- | --- | --- |
| Wilayah tidak berjenjang | POST `/orders` | 422 | 422 | 2 ms |
| Data checkout tidak valid | POST `/orders` | 422 | 422 | 1 ms |
| Checkout item terpilih (kurir otomatis POS) | POST `/orders` | 201 | 201 | 169 ms |
| Total dihitung server (subtotal + ongkir) | POST `/orders` | — | 201 | 169 ms |
| Item yang di-checkout keluar dari keranjang | GET `/cart` | 200 | 200 | 4 ms |
| Stok berkurang (10 → 8), cache ikut segar | GET `/products/{id}` | 200 | 200 | 2 ms |
| Daftar order saya | GET `/orders` | 200 | 200 | 3 ms |
| Filter status tidak dikenal | GET `/orders` | 400 | 400 | 1 ms |
| Detail order (payment & shipment null) | GET `/orders/{id}` | 200 | 200 | 13 ms |
| Admin cari order per nomor | GET `/admin/orders` | 200 | 200 | 2 ms |
| Customer akses daftar order admin | GET `/admin/orders` | 403 | 403 | 0 ms |
| Transisi status tidak valid | PUT `/admin/orders/{id}/status` | 409 | 409 | 1 ms |
| Status tidak dikenal | PUT `/admin/orders/{id}/status` | 422 | 422 | 1 ms |
| User lain buka order orang | GET `/orders/{id}` | 404 | 404 | 1 ms |

## Pembayaran 17/17

| Skenario | Endpoint | Harapan | Hasil | Waktu |
| --- | --- | --- | --- | --- |
| User lain buka pembayaran orang | GET `/orders/{id}/payment` | 404 | 404 | 2 ms |
| Pembayaran belum dibuat | GET `/orders/{id}/payment` | 404 | 404 | 1 ms |
| Metode tidak dikenal | POST `/orders/{id}/payment` | 422 | 422 | 1 ms |
| Buat tagihan (total + kode unik) | POST `/orders/{id}/payment` | 201 | 201 | 6 ms |
| Tagihan ganda | POST `/orders/{id}/payment` | 409 | 409 | 2 ms |
| Verifikasi tanpa bukti | POST `/admin/payments/{id}/review` | 409 | 409 | 2 ms |
| Bukti tipe salah | PUT `/orders/{id}/payment/proof` | 415 | 415 | 2 ms |
| Bukti > 2 MB | PUT `/orders/{id}/payment/proof` | 413 | 413 | 32 ms |
| Upload bukti | PUT `/orders/{id}/payment/proof` | 200 | 200 | 6 ms |
| Unduh bukti (isi & tipe sama) | GET `/orders/{id}/payment/proof` | 200 | 200 | 4 ms |
| Antrean verifikasi admin | GET `/admin/payments` | 200 | 200 | 2 ms |
| Tolak pembayaran | POST `/admin/payments/{id}/review` | 200 | 200 | 3 ms |
| Verifikasi ulang tanpa bukti baru | POST `/admin/payments/{id}/review` | 409 | 409 | 2 ms |
| Upload ulang → kembali pending | PUT `/orders/{id}/payment/proof` | 200 | 200 | 4 ms |
| Setujui pembayaran | POST `/admin/payments/{id}/review` | 200 | 200 | 3 ms |
| Order otomatis jadi paid | GET `/orders/{id}` | 200 | 200 | 3 ms |
| Ganti bukti setelah disetujui | PUT `/orders/{id}/payment/proof` | 409 | 409 | 2 ms |

## Pengiriman & Resi 11/11

| Skenario | Endpoint | Harapan | Hasil | Waktu |
| --- | --- | --- | --- | --- |
| paid → processing | PUT `/admin/orders/{id}/status` | 200 | 200 | 3 ms |
| Data pengiriman belum ada | GET `/orders/{id}/shipment` | 404 | 404 | 2 ms |
| Kirim tanpa no. resi | PUT `/admin/orders/{id}/status` | 422 | 422 | 1 ms |
| Gagal kirim tidak mengubah status | GET `/orders/{id}` | 200 | 200 | 4 ms |
| processing → shipped + no. resi (email ke customer) | PUT `/admin/orders/{id}/status` | 200 | 200 | 4 ms |
| Pengiriman tercatat otomatis (kurir POS + resi) | GET `/orders/{id}/shipment` | 200 | 200 | 2 ms |
| Koreksi resi | PUT `/orders/{id}/shipment` | 200 | 200 | 3 ms |
| Data pengiriman tidak valid | PUT `/orders/{id}/shipment` | 422 | 422 | 1 ms |
| Customer ubah pengiriman | PUT `/orders/{id}/shipment` | 403 | 403 | 1 ms |
| shipped → completed | PUT `/admin/orders/{id}/status` | 200 | 200 | 6 ms |
| Detail order memuat payment & shipment | GET `/orders/{id}` | 200 | 200 | 4 ms |

## Pembatalan & Batasan Hapus 12/12

| Skenario | Endpoint | Harapan | Hasil | Waktu |
| --- | --- | --- | --- | --- |
| Checkout seluruh keranjang | POST `/orders` | 201 | 201 | 162 ms |
| Batalkan order | PUT `/admin/orders/{id}/status` | 200 | 200 | 4 ms |
| Stok dikembalikan (cache ikut segar) | GET `/products/{id}` | 200 | 200 | 2 ms |
| Bayar order dibatalkan | POST `/orders/{id}/payment` | 409 | 409 | 2 ms |
| Checkout keranjang kosong | POST `/orders` | 422 | 422 | 3 ms |
| Hapus item keranjang | DELETE `/cart/items/{id}` | 204 | 204 | 2 ms |
| Kosongkan keranjang | DELETE `/cart` | 204 | 204 | 2 ms |
| Hapus varian yang sudah dipesan | DELETE `/products/{id}/variants/{id}` | 409 | 409 | 3 ms |
| Hapus produk yang sudah dipesan | DELETE `/products/{id}` | 409 | 409 | 5 ms |
| Produk inactive tersembunyi dari publik | GET `/products/{id}` | 404 | 404 | 2 ms |
| Produk inactive terlihat admin | GET `/products/{id}` | 200 | 200 | 1 ms |
| Hapus produk | DELETE `/products/{id}` | 204 | 204 | 2 ms |

## Unit test 10/10

-   OK `internal/app/api/auth`
-   OK `internal/app/api/category`
-   OK `internal/app/api/middleware`
-   OK `internal/app/api/order`
-   OK `internal/app/api/product`
-   OK `internal/app/api/user`
-   OK `internal/pkg/rajaongkir`
-   OK `internal/pkg/response`
-   OK `internal/pkg/token`
-   OK `internal/pkg/validator`

Dibuat otomatis dari skrip end-to-end. Kolom “Harapan” = status HTTP yang diharapkan, “Hasil” = status yang diterima.

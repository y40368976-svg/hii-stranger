# Panduan Menulis Fitur (Pemula)

Satu fitur (misal produk) = satu folder di `internal/app/api/`. Isinya 4 file kecil, masing-masing punya satu tugas.

## 1. Bayangkan seperti restoran

**routes.go — papan nama pintu** Menentukan alamat URL mana dilayani siapa. Contoh: `GET /products` dilayani `List`.

**handler.go — pelayan** Menerima pesanan dari pengguna, mengecek isinya benar atau tidak, lalu mengirim jawaban.

**service.go — manajer** Memegang aturan. Contoh: "pembeli biasa hanya boleh lihat produk yang aktif".

**repository.go — juru gudang** Satu-satunya yang bicara ke database (ambil, simpan, ubah, hapus).

**model.go — daftar menu** Bentuk datanya: produk punya nama, harga, dan seterusnya.

**Perjalanan satu permintaan:**

Pengguna→routes→handler→service→repository→database

Jawabannya kembali lewat jalan yang sama.

## 2. Cara termudah membuat fitur baru

Jangan mulai dari kosong. Buka folder `category/` atau `product/` yang sudah jadi, lalu tiru polanya.

1.  **Lihat contekannya** Buka `api/openapi.yaml` (isi permintaan dan jawaban yang diminta) dan file di folder `migrations/` (nama kolom tabel).
2.  **model.go** Tulis bentuk datanya, sesuai kolom tabel.
3.  **repository.go** Tulis perintah database: ambil daftar, ambil satu, buat, ubah, hapus.
4.  **service.go** Panggil repository. Kalau ada aturan, tambahkan di sini. Kalau tidak ada, cukup teruskan saja.
5.  **handler.go** Baca permintaan, cek isinya, panggil service, kirim jawaban.
6.  **server.go** Sambungkan: repository → service → handler (lihat bagian `category` di file itu, tinggal tiru).
7.  **routes.go** Daftarkan URL-nya (tiru bagian `categories`).
8.  **Tes** Jalankan perintah di bagian 4, lalu coba lewat Postman.

Kenapa urutannya begini? Yang paling bawah (data) ditulis dulu, yang paling atas (URL) terakhir. Jadi setiap langkah bisa dicek sebelum lanjut.

## 3. Isi handler: selalu 5 langkah ini

```
1. Ambil ID / filter dari URL
2. Baca isi (body) yang dikirim pengguna
3. Cek isinya benar atau tidak  -> kalau salah, jawab 422
4. Panggil service
5. Kirim jawaban (sukses, atau error yang sesuai)
```

## 4. Cek sebelum bilang selesai

Buka terminal di folder `backend`, ganti `nama` dengan nama folder fiturmu:

```
gofmt -l internal/app/api/nama      # kalau ada nama file keluar, berarti belum rapi
go vet ./internal/app/api/nama/     # cari kesalahan
go test ./internal/app/api/nama/    # jalankan tes
```

Kalau ketiganya tidak menampilkan error, coba endpoint-nya lewat Postman.

## 5. Kode jawaban (status code)

| Kode | Artinya |
| --- | --- |
| 200 / 201 / 204 | Berhasil (ambil atau ubah / buat / hapus) |
| 400 | Kirimannya rusak |
| 401 | Belum login |
| 403 | Sudah login, tapi bukan admin |
| 404 | Datanya tidak ada |
| 409 | Bentrok (misal data masih dipakai) |
| 422 | Isi yang dikirim tidak valid |

## 6. Tiga aturan penting

-   Jangan bikin file atau fungsi yang belum dibutuhkan. Mulai dari yang paling sederhana.
-   Jangan kirim pesan error database ke pengguna. Cukup catat dengan `slog`.
-   Jangan bilang selesai sebelum langkah 4 lolos dan endpoint sudah dicoba.

## 7. Progres fitur

Sudah: User, Category, Product. Berikutnya: Variants & images, Banner, Site settings, Shipping rates, Cart, Order, Payment, Shipment.

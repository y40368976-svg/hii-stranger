Go Project Layout
Kerangka direktori untuk membantu menyusun proyek backend menggunakan bahasa Go. Struktur ini memisahkan aplikasi yang dapat dijalankan, kode internal, package publik, konfigurasi, dokumentasi, aset, skrip, dan kebutuhan build/deployment.
> **Penting:** repositori ini adalah kerangka/rujukan struktur proyek. Keberadaan sebuah direktori tidak berarti fitur atau implementasi di dalamnya sudah tersedia. Sesuaikan struktur dengan kebutuhan aplikasi dan jangan membuat lapisan atau direktori yang tidak diperlukan.
Daftar Isi
Tujuan
Struktur Direktori
Penjelasan Direktori
Prinsip Penempatan Kode
Memulai Proyek
Perintah Pengembangan
Pengujian dan Pemeriksaan
Build dan Deployment
Konfigurasi dan Secret
Panduan Kontribusi
Referensi
Tujuan
Struktur ini bertujuan untuk:
Menjaga kode aplikasi tetap terorganisasi.
Memisahkan kode khusus aplikasi dari package yang memang ditujukan untuk digunakan ulang.
Menempatkan entry point aplikasi pada lokasi yang mudah ditemukan.
Menyediakan tempat yang konsisten untuk konfigurasi, dokumentasi, skrip, pengujian, dan artefak build.
Memudahkan tim memahami tanggung jawab setiap bagian proyek.
Struktur ini merupakan pedoman, bukan aturan mutlak. Gunakan bagian yang memang dibutuhkan.
Struktur Direktori
Struktur berdasarkan direktori yang tersedia pada repositori ini:
```text
go-project-layout/
├── api/
├── assets/
├── build/
│   ├── ci/
│   └── package/
├── cmd/
│   └── _your_app_/
├── configs/
├── deployments/
├── docs/
├── examples/
├── githooks/
├── init/
├── internal/
│   ├── app/
│   │   └── _your_app_/
│   └── pkg/
│       └── _your_private_lib_/
├── pkg/
│   └── _your_public_lib_/
├── scripts/
├── test/
├── third_party/
├── tools/
├── vendor/
├── web/
│   ├── app/
│   ├── static/
│   └── template/
├── website/
├── .editorconfig
├── .gitattributes
├── .gitignore
├── go.mod
├── LICENSE.md
├── Makefile
└── README.md
```
Direktori bertanda `_your_app_`, `_your_private_lib_`, dan `_your_public_lib_` adalah nama contoh/placeholder. Ganti dengan nama yang sesuai ketika benar-benar diperlukan. Direktori dengan awalan `_` atau `.` dapat memiliki perlakuan khusus oleh beberapa tool Go; jangan menganggap source code di dalam direktori tersebut otomatis ikut dikompilasi oleh `go test ./...`.
Penjelasan Direktori
Direktori	Fungsi
`api/`	Dokumen kontrak API, misalnya OpenAPI/Swagger, spesifikasi endpoint, atau skema protokol.
`assets/`	Aset pendukung yang digunakan oleh aplikasi atau proses build, misalnya file gambar, template, atau aset lain yang bukan source code Go.
`build/`	File dan konfigurasi yang membantu proses build serta packaging aplikasi.
`build/ci/`	Konfigurasi atau file pendukung Continuous Integration (CI).
`build/package/`	File untuk mengemas aplikasi, misalnya konfigurasi paket atau image container.
`cmd/`	Entry point program yang dapat dieksekusi. Setiap subdirektori biasanya menghasilkan satu binary/aplikasi.
`configs/`	Contoh atau file konfigurasi non-rahasia. Mekanisme pemuatan konfigurasi tetap ditentukan oleh aplikasi.
`deployments/`	Konfigurasi deployment, misalnya manifest Kubernetes, Helm, atau konfigurasi platform deployment lain.
`docs/`	Dokumentasi teknis dan dokumentasi desain proyek.
`examples/`	Contoh penggunaan API, package, atau fitur proyek.
`githooks/`	Contoh atau skrip Git hooks yang dapat digunakan tim. Pemasangannya perlu dilakukan secara eksplisit.
`init/`	File inisialisasi sistem atau layanan yang digunakan pada lingkungan tertentu.
`internal/`	Kode Go privat untuk module ini. Package di dalamnya tidak dapat diimpor oleh module lain di luar batas `internal` yang ditetapkan Go.
`internal/app/`	Implementasi aplikasi yang bersifat privat, biasanya dikelompokkan berdasarkan nama aplikasi atau layanan.
`internal/pkg/`	Library privat yang digunakan ulang di dalam proyek ini saja.
`pkg/`	Package Go yang memang dimaksudkan untuk dapat digunakan oleh proyek/module lain. Jangan menaruh kode di sini jika belum ada kebutuhan penggunaan publik.
`scripts/`	Skrip otomasi untuk pengembangan, pemeriksaan, build, migrasi, atau pekerjaan operasional.
`test/`	Data, fixture, atau dukungan integration/end-to-end test yang tidak cocok ditempatkan di dekat package yang diuji. Unit test Go biasanya tetap diletakkan bersama file package terkait.
`third_party/`	Kode atau materi pihak ketiga yang disimpan/dikelola secara eksplisit oleh proyek. Perhatikan lisensi dan asal-usulnya.
`tools/`	Tool pendukung pengembangan atau build yang dibutuhkan proyek.
`vendor/`	Salinan dependensi Go jika proyek memilih menggunakan mekanisme vendoring. Dikelola oleh Go tooling, bukan tempat menulis kode aplikasi sendiri.
`web/`	Aset dan bagian aplikasi web jika backend juga menyajikan antarmuka web.
`web/app/`	Kode atau sumber daya aplikasi web.
`web/static/`	File statis seperti CSS, JavaScript, ikon, dan gambar.
`web/template/`	Template HTML atau template tampilan server-side.
`website/`	Sumber dokumentasi situs atau website proyek, jika memang ada.
File pada direktori root
File	Fungsi
`go.mod`	Mendefinisikan module path, versi Go, dan dependensi module.
`go.sum`	Mencatat checksum dependensi yang diverifikasi Go. File ini akan muncul setelah dependensi dikelola oleh Go tooling.
`Makefile`	Kumpulan target perintah otomasi, misalnya `make test` atau `make build`, jika target tersebut didefinisikan.
`.gitignore`	Menentukan file/direktori yang tidak dilacak Git.
`.editorconfig`	Menyamakan pengaturan dasar editor antaranggota tim.
`.gitattributes`	Mengatur atribut file Git, misalnya normalisasi line ending.
`LICENSE.md`	Informasi lisensi penggunaan dan distribusi proyek.
`README.md`	Dokumentasi utama dan panduan penggunaan proyek.
Prinsip Penempatan Kode
1. Entry point di `cmd/`
Letakkan fungsi `main` untuk setiap executable di direktori tersendiri di bawah `cmd/`.
Contoh:
```text
cmd/
└── api/
    └── main.go
```
`main.go` sebaiknya bertugas menghubungkan konfigurasi, inisialisasi dependency, dan lifecycle aplikasi. Hindari menaruh seluruh logika bisnis di dalam `main.go`.
2. Kode privat di `internal/`
Gunakan `internal/` untuk implementasi yang hanya boleh digunakan oleh module atau area proyek yang diizinkan oleh aturan Go.
Contoh pengelompokan yang mungkin digunakan:
```text
internal/
├── app/
│   └── api/
│       ├── handler/
│       ├── service/
│       └── repository/
└── pkg/
    └── validator/
```
Contoh tersebut hanya ilustrasi. Buat subpackage jika pemisahan tanggung jawab benar-benar membantu. Tidak semua proyek membutuhkan `handler`, `service`, dan `repository` sebagai package terpisah.
3. Package yang dapat digunakan ulang di `pkg/`
Tempatkan package di `pkg/` hanya jika memang dirancang untuk digunakan oleh module lain. Jika package hanya dipakai aplikasi ini, utamakan `internal/`.
4. Pengujian dekat dengan kode
Unit test biasanya berada di package yang sama dengan kode yang diuji, menggunakan file berakhiran `_test.go`.
Contoh:
```text
internal/
└── app/
    └── api/
        └── user/
            ├── service.go
            └── service_test.go
```
Gunakan `test/` untuk kebutuhan integration test, end-to-end test, fixture, atau data uji bersama jika memang diperlukan.
Memulai Proyek
Pastikan Go sudah terpasang:
```bash
go version
```
Periksa module:
```bash
go env GOMOD
go list ./...
```
Jika repositori ini masih berupa template, lakukan langkah berikut:
Tentukan module path yang sesuai dengan repositori Git.
Periksa dan sesuaikan `go.mod`.
Ganti direktori placeholder seperti `_your_app_` dengan nama aplikasi yang sebenarnya.
Buat entry point di `cmd/<nama-aplikasi>/main.go`.
Letakkan implementasi privat di `internal/`.
Tambahkan konfigurasi contoh tanpa secret asli.
Tambahkan pengujian untuk perilaku yang dibuat.
Hapus direktori kosong atau bagian template yang tidak digunakan jika memang tidak diperlukan.
Contoh inisialisasi module baru (jalankan hanya jika module belum tersedia):
```bash
go mod init github.com/organisasi/nama-proyek
```
Jangan menjalankan `go mod init` pada module yang sudah memiliki `go.mod`.
Perintah Pengembangan
Perintah umum yang dapat digunakan:
```bash
# Mengunduh dan memverifikasi dependensi
go mod download
go mod verify

# Menampilkan daftar package dalam module
go list ./...

# Menjalankan aplikasi (sesuaikan path package)
go run ./cmd/api

# Menambahkan atau merapikan dependensi berdasarkan import
go mod tidy
```
`cmd/api` hanyalah contoh. Ganti dengan direktori executable yang benar-benar tersedia pada proyek.
Jika proyek menyediakan `Makefile`, periksa target yang tersedia sebelum menggunakannya:
```bash
make help
```
Perintah tersebut hanya berlaku jika target `help` memang didefinisikan.
Pengujian dan Pemeriksaan
Jalankan pemeriksaan dari direktori yang berisi `go.mod`:
```bash
# Format file Go
gofmt -w path/ke/file.go

# Analisis statis dasar
go vet ./...

# Jalankan seluruh pengujian
go test ./...

# Jalankan pengujian dengan race detector jika relevan
go test -race ./...
```
Untuk menguji satu package:
```bash
go test ./internal/app/...
```
Jangan menganggap direktori kosong atau placeholder sebagai implementasi yang sudah diuji. Laporkan pemeriksaan yang benar-benar dijalankan beserta hasilnya.
Build dan Deployment
Contoh build executable:
```bash
go build -o bin/api ./cmd/api
```
Pada Windows, nama output dapat disesuaikan, misalnya `bin/api.exe`.
Simpan hasil build di direktori output yang diabaikan Git. Jangan commit binary hasil build kecuali memang menjadi artefak distribusi yang disengaja.
Detail deployment ditempatkan di `deployments/`. Detail proses CI ditempatkan di `build/ci/` atau konfigurasi CI yang digunakan repositori. Sesuaikan dengan platform sebenarnya; direktori tersebut tidak otomatis berarti proyek sudah memiliki pipeline atau deployment siap pakai.
Konfigurasi dan Secret
Simpan konfigurasi contoh di `configs/` jika sesuai.
Gunakan environment variable atau secret manager untuk nilai sensitif.
Jangan commit password, token, private key, atau file `.env` yang berisi secret asli.
Sediakan `.env.example` hanya dengan nama variabel dan nilai contoh yang tidak sensitif jika aplikasi membutuhkannya.
Validasi konfigurasi wajib ketika aplikasi dimulai.
Dokumentasikan nama variabel, tujuan, dan apakah variabel wajib atau opsional.
Panduan Kontribusi
Sebelum membuat perubahan:
Baca `AGENTS.md` pada root proyek.
Pahami struktur dan konvensi kode yang sudah ada.
Periksa perubahan lokal agar pekerjaan yang belum di-commit tidak tertimpa.
Buat perubahan sekecil mungkin dan tetap fokus pada kebutuhan.
Tambahkan atau perbarui pengujian yang relevan.
Jalankan `gofmt`, `go vet ./...`, dan `go test ./...` sesuai kondisi proyek.
Tinjau diff sebelum commit.
Jelaskan perubahan, hasil pemeriksaan, dan keterbatasan yang masih ada.
Jangan melakukan refaktor yang tidak berkaitan atau menjalankan perintah Git destruktif tanpa persetujuan.
Referensi
Dokumentasi resmi Go
Go Modules Reference
Go Code Review Comments
Go Project Layout
---
Dokumentasi ini menjelaskan tujuan umum direktori yang tercantum pada template. Detail implementasi tetap harus mengikuti isi kode, `go.mod`, dan kebutuhan nyata repositori.

# Kebijakan Keamanan

Dokumen ini menjelaskan versi yang didukung, cara melaporkan kerentanan, dan
kontrol keamanan yang sudah berjalan pada proyek **Hii Stranger**.

## Versi yang Didukung

Proyek ini dikembangkan sebagai satu aplikasi aktif (backend Go + frontend Next.js).
Pembaruan keamanan hanya diberikan untuk kode pada branch `main` terbaru.

| Versi | Didukung |
| ----- | -------- |
| `main` (terbaru) | :white_check_mark: |
| Commit/branch lama | :x: |

## Melaporkan Kerentanan

**Jangan** membuka Issue publik untuk kerentanan keamanan, karena Issue dapat
dibaca siapa saja.

Gunakan salah satu jalur privat berikut:

1. **GitHub Private Vulnerability Reporting** — buka tab **Security** repositori,
   lalu **Report a vulnerability**. Laporan hanya terlihat oleh pengelola.
2. **Kontak langsung** — hubungi pengelola di [email/kontak kelompok] (lihat `AUTHORS.md`).

Sertakan sebisanya:

- Deskripsi kerentanan dan dampaknya.
- Langkah reproduksi atau proof of concept.
- Komponen yang terdampak (endpoint, file, atau versi).
- Saran perbaikan bila ada.

## Waktu Tanggapan

| Tahap | Target |
| ----- | ------ |
| Konfirmasi laporan diterima | dalam 3 hari kerja |
| Penilaian awal & tingkat keparahan | dalam 7 hari kerja |
| Perbaikan untuk kerentanan terkonfirmasi | sesuai tingkat keparahan |

Jika laporan diterima, kami akan mengabari perkembangan perbaikan dan memberi
kredit kepada pelapor bila diinginkan. Jika ditolak, kami jelaskan alasannya.

## Cakupan

**Termasuk:** kode di `backend/` dan `frontend/`, spesifikasi API
(`backend/api/openapi.yaml`), serta konfigurasi deployment di repositori ini.

**Tidak termasuk:** kerentanan pada dependensi pihak ketiga (laporkan ke proyek
terkait; penanganan versinya dikelola lewat Dependabot), serta layanan eksternal
(Cloudinary, RajaOngkir, penyedia email/basis data).

## Kontrol Keamanan yang Berjalan

Pemindaian otomatis pada CI (`.github/workflows/`):

- **CodeQL** — analisis kode statis untuk Go dan JavaScript/TypeScript.
- **govulncheck** — memblokir build bila ada CVE Go yang benar-benar terpanggil.
- **gosec** — pemindai masalah keamanan kode Go; memblokir build bila ada temuan.
- **Dependabot** — pembaruan dependensi mingguan + peringatan kerentanan.
- **gitleaks** — deteksi rahasia/kredensial yang ikut ter-commit. Lokal: pasang
  gitleaks lalu `git config core.hooksPath .githooks`; tanpa gitleaks, commit ditolak.
- **pnpm audit** — audit kerentanan dependensi frontend (level high, produksi).

Build Docker dan rilis (tag `v*`) hanya berjalan bila semua pemeriksaan di atas lulus.

Kontrol pada aplikasi (middleware backend):

- Security headers (`securityheaders.go`).
- Pembatasan laju permintaan / rate limit (`ratelimit.go`).
- Pembatasan ukuran body & CORS (`limits.go`, `cors.go`).
- Pemulihan panic agar proses tidak tumbang (`recover.go`).
- Autentikasi berbasis token dan pemisahan peran admin.

## Pengungkapan yang Bertanggung Jawab

Kami menghargai pelaporan yang bertanggung jawab. Selama Anda menguji tanpa
merusak data, mengakses data pengguna lain, atau mengganggu layanan, dan memberi
kami waktu wajar untuk memperbaiki sebelum mengungkap ke publik, kami tidak akan
menempuh tindakan hukum atas pengujian keamanan yang beritikad baik.

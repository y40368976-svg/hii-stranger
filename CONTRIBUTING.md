# Kontribusi

Proyek ini milik Kelompok 1 PPSI 4KA21 (lihat `LICENSE` dan `AUTHORS.md`).
Kontribusi dari luar kelompok hanya diterima dengan persetujuan pengelola.

## Alur kerja
1. Buat branch dari `main`: `feat/...`, `fix/...`, atau `docs/...`.
2. Commit dengan pesan jelas (disarankan Conventional Commits).
3. Buka Pull Request ke `main`; isi templat PR.
4. Pastikan CI hijau sebelum merge.

## Pemeriksaan lokal
Backend:
```
cd backend && make vet test
```
Frontend:
```
cd frontend && pnpm lint && pnpm exec tsc --noEmit
```

## Keamanan
Jangan laporkan kerentanan lewat Issue publik. Lihat `SECURITY.md`.

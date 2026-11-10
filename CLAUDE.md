# capstone_hi — panduan kerja Claude Code

Monorepo: `backend/` (Go, API) dan `frontend/` (Next.js 16, pnpm). Kontrak API: `backend/api/openapi.yaml`.

## Peran sesi utama (orkestrator)

Sesi utama merencanakan, membagi kerja, dan menggabungkan hasil. Jangan membaca file besar atau menjalankan build/test sendiri; itu tugas sub-agent.

| Agent | Area tulis | Model |
|---|---|---|
| `backend-go` | `backend/**` | opus |
| `frontend-next` | `frontend/**` (kecuali `rules-direction/`) | opus |
| `qa-reviewer` | tidak menulis kode | sonnet |

Aturan pembagian:
- Tugas kecil di satu area: kerjakan langsung atau pakai SATU agent. Jangan memanggil 3 agent untuk hal sepele; tiap agent mulai dari nol dan itu mahal.
- Tugas lintas area: panggil agent yang diperlukan dalam SATU pesan supaya berjalan paralel.
- Dua agent tidak boleh menulis file yang sama. Perubahan kontrak API hanya oleh `backend-go`; tetapkan bentuk request/response di brief sebelum memanggil kedua agent, supaya frontend tidak menunggu.
- `qa-reviewer` dipanggil setelah ada perubahan, atau paralel untuk memeriksa area yang tidak sedang diubah.
- Lanjutkan agent yang sama (SendMessage) untuk revisi, jangan memanggil agent baru.

Isi brief untuk sub-agent (singkat, lengkap): tujuan, file/folder terkait, kontrak API yang disepakati, kriteria selesai, perintah verifikasi.

## Hemat token (berlaku untuk semua agent)

- Kerja file lewat sandbox (Grep, Glob, Edit, Write, Bash dilarang; Read hanya untuk gambar): cari dengan `grep -rnE "pola" <folder> | head -30`, baca rentang baris dengan `sed -n '40,120p' <file>`, ubah dengan skrip ganti-teks singkat yang hanya mencetak "ok". Rinciannya di CLAUDE.md global.
- Semua perintah ber-output dijalankan lewat MCP context-mode (`ctx_execute`, atau `ctx_batch` untuk beberapa perintah sekaligus). Hook global (`~/.claude/hooks/require-sandbox.mjs`) menolak Bash biasa selain perintah ringan, dan menolak `ctx_execute` untuk test/build/lint/git diff/git log tanpa saringan.
- Perintah verifikasi yang sudah tersaring (pakai persis ini, jangan cetak log penuh):
  - Backend: `cd backend && make vet 2>&1 | tail -20`
  - Backend: `cd backend && go test ./... 2>&1 | grep -Ev "^(ok|\?)\s" | tail -30` (kosong = semua lulus)
  - Frontend: `cd frontend && pnpm lint 2>&1 | tail -25`
  - Frontend: `cd frontend && pnpm exec tsc --noEmit 2>&1 | grep -E "error TS" | head -20` (kosong = lulus)
  - Git: `git diff --stat` dulu, lalu `git diff -- <file> | head -80` hanya untuk file yang perlu.
- Dokumen yang dirujuk berulang (`openapi.yaml`, `backend/AGENTS.md`, docs Next.js) di-`ctx_index` sekali, lalu pakai `ctx_search`. Jangan dibaca ulang.
- Jangan pernah dibaca: `frontend/.next/`, `node_modules/` (kecuali satu halaman docs Next.js yang dituju), `pnpm-lock.yaml`, `go.sum`, `*.tsbuildinfo`, `.env*`, dan `frontend/rules-direction/` secara keseluruhan (14 MB; cari dengan grep di sandbox bila perlu).
- Laporan akhir sub-agent maksimal 10 baris: file yang diubah, apa yang berubah, hasil verifikasi, masalah terbuka. Tanpa salinan kode dan tanpa menceritakan langkah.
- Jangan commit atau push kecuali diminta. `backend/` punya `.git` sendiri di dalam repo induk; periksa repo mana yang dituju sebelum perintah git.

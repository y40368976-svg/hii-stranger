# capstone_hi — panduan kerja Claude Code

Monorepo: `backend/` (Go, API) dan `frontend/` (Next.js 16, pnpm). Kontrak API: `backend/api/openapi.yaml`.

Selalu pakai gaya ponytail (kode seminimal mungkin, seperti senior dev) di atas wadah context-mode; keduanya aktif otomatis, tanpa perlu dipanggil.

## Peran sesi utama (orkestrator)

Sesi utama merencanakan, membagi kerja, dan menggabungkan hasil. Jangan membaca file besar atau menjalankan build/test sendiri; itu tugas sub-agent.

| Agent | Area tulis | Model |
|---|---|---|
| `backend-go` | `backend/**` | sonnet |
| `frontend-next` | `frontend/**` (kecuali `rules-direction/`) | sonnet |
| `qa-reviewer` | tidak menulis kode | sonnet |
| `dev` (default sesi) | `backend/**` dan `frontend/**` | sonnet |

Default repo: agent `dev` (`.claude/settings.json` -> `"agent": "dev"`), gabungan ponytail + context-mode. Model default sonnet, effort medium; sub-agent ringan (cari/baca/rangkum) pakai haiku, tugas berat (arsitektur, debug lintas modul, refactor besar, review keamanan) boleh opus. Agent khusus di bawah dipakai bila perlu pemisahan area.

Aturan pembagian:
- Tugas kecil di satu area: kerjakan langsung atau pakai SATU agent. Jangan memanggil 3 agent untuk hal sepele; tiap agent mulai dari nol dan itu mahal.
- Tugas lintas area: panggil agent SATU per SATU (berurutan), tunggu selesai sebelum memanggil berikutnya, supaya tidak berebut CPU. Urutan: `backend-go` (kontrak) → `frontend-next` → `qa-reviewer`.
- Dua agent tidak boleh menulis file yang sama. Perubahan kontrak API hanya oleh `backend-go`; tetapkan bentuk request/response di brief sebelum memanggil kedua agent, supaya frontend tidak menunggu.
- `qa-reviewer` dipanggil setelah agent penulis selesai, tidak pernah bersamaan dengan agent lain.
- CPU: jangan menjalankan dua build/test/lint sekaligus (mis. `go test` dan `pnpm lint` bersamaan). Satu perintah berat pada satu waktu; `ctx_batch` untuk perintah berat dijalankan satu-satu, bukan paralel. Backend sudah `-p 1 -parallel 1` lewat Makefile, frontend `maxWorkers: 1`; perintah `go test` langsung tambahkan `-p 1 -parallel 1`.
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

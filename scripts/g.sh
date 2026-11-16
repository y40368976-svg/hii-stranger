#!/usr/bin/env bash
# Alur git ringkas: new -> save -> pr -> merge. Pakai: scripts/g.sh <perintah>
set -euo pipefail
main=main
cur=$(git branch --show-current)
not_main() { [ "$cur" != "$main" ] || { echo "Kamu di $main; buat branch dulu: g new feat/nama"; exit 1; }; }

case "${1:-}" in
  new) # g new feat/nama : branch baru dari main terbaru (perubahan belum commit ikut terbawa)
    [ -n "${2:-}" ] || { echo "pakai: g new <feat/nama>"; exit 1; }
    git fetch -q origin "$main"
    git switch -c "$2" "origin/$main" ;;
  save) # g save "pesan" : add semua + commit + push
    not_main; [ -n "${2:-}" ] || { echo 'pakai: g save "pesan commit"'; exit 1; }
    git add -A && git commit -m "$2" && git push -u origin "$cur" ;;
  pr) # g pr : buat PR (judul dari commit terakhir) bila belum ada
    not_main; gh pr view >/dev/null 2>&1 && gh pr view --web || gh pr create --fill --base "$main" ;;
  ship) # g ship "pesan" : save + pr
    "$0" save "${2:-}" && "$0" pr ;;
  merge) # g merge : merge PR (merge commit), hapus branch, balik ke main terbaru
    not_main; gh pr merge --merge --delete-branch && git switch "$main" && git pull -q --ff-only && git fetch -q --prune ;;
  sync) # g sync : main terbaru + bersihkan branch lokal yang sudah merge
    git switch "$main" && git pull --ff-only && git fetch -q --prune
    git branch --merged "$main" | grep -vE "^\*|\b$main\b" | xargs -r git branch -d ;;
  st) git status -sb | head -30 ;;
  *) echo "g new <nama> | save \"msg\" | pr | ship \"msg\" | merge | sync | st"; exit 1 ;;
esac

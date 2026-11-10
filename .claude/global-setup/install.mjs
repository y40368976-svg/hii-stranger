// Memasang pemaksa sandbox context-mode untuk SEMUA project Claude Code (tingkat user).
// Jalankan sekali:  node install.mjs      Membatalkan:  node install.mjs --uninstall
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const claudeDir = join(homedir(), ".claude");
const hookPath = join(claudeDir, "hooks", "require-sandbox.mjs");
const settingsPath = join(claudeDir, "settings.json");
const memoryPath = join(claudeDir, "CLAUDE.md");
// Pakai Bun bila terpasang (mulai lebih cepat), selain itu Node.
const hasBun = typeof Bun !== "undefined" || spawnSync("bun", ["--version"], { shell: true }).status === 0;
const runtime = hasBun ? "bun" : "node";
const hookCommand = `${runtime} "${hookPath.replace(/\\/g, "/")}"`;
const BEGIN = "<!-- BEGIN:hemat-token -->";
const END = "<!-- END:hemat-token -->";
const RULES = `${BEGIN}
## Hemat token (semua project): SEMUA lewat sandbox context-mode
Bash, PowerShell, Grep, Glob, Edit, dan Write dilarang di pengaturan user; tool Read hanya untuk gambar/PDF. Jangan mencoba memanggilnya. Semua kerja memakai MCP context-mode: \`ctx_execute\`, \`ctx_batch\` (beberapa perintah + pertanyaan sekaligus), \`ctx_index\`/\`ctx_search\`.

Cara kerja file (cetak sesedikit mungkin):
- Cari: \`grep -rnE "pola" <folder> --include="*.go" | head -30\`; daftar file: \`git ls-files | grep <pola> | head -40\`.
- Baca: rentang baris saja, \`sed -n '40,120p' <file>\`. Jangan \`cat\` seluruh file dan jangan baca ulang file yang baru diubah.
- Ubah: skrip singkat (language javascript atau python) yang mengganti teks lama dengan teks baru secara persis, gagal bila teks lama tidak ditemukan tepat satu kali, dan hanya mencetak "ok". Jangan menulis ulang file utuh untuk perubahan kecil, dan jangan mencetak isi file setelah mengubah.
- File baru: heredoc, \`cat > <path> <<'EOF'\`.
- Beberapa perubahan atau pemeriksaan kecil digabung dalam SATU panggilan, bukan satu panggilan per langkah.

Output WAJIB disaring di dalam perintahnya; hook global menolak test/build/lint/git diff/git log/cat tanpa saringan:
- Test: hanya yang gagal + ringkasan. \`go test ./... 2>&1 | grep -Ev "^(ok|\\?)\\s" | tail -30\` · \`cargo test -q 2>&1 | grep -E "^test result|FAILED|panicked|^error" | head -40\` · \`flutter test --reporter failures-only 2>&1 | tail -30\` · \`pytest -q 2>&1 | tail -25\` · \`npm test 2>&1 | tail -30\`
- Lint/typecheck/build: \`<perintah> 2>&1 | tail -25\`, atau \`| grep -E "error" | head -20\`
- Git: \`git diff --stat\` dulu, lalu \`git diff -- <file> | head -80\`; \`git log --oneline -10\`
- Output yang mungkin besar dan sulit disaring: isi parameter \`intent\` di ctx_execute.
- Bila project punya perintah tersaring sendiri di CLAUDE.md-nya, pakai yang itu.

Sub-agent: paling banyak 3 paralel, dipanggil dalam satu pesan; tugas kecil dikerjakan sendiri. Laporan sub-agent maksimal 10 baris.
${END}`;

const uninstall = process.argv.includes("--uninstall");
const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8").replace(/^﻿/, "")) : {});
const isOurs = (entry) => (entry.hooks ?? []).some((h) => (h.command ?? "").includes("require-sandbox.mjs"));

mkdirSync(dirname(hookPath), { recursive: true });

// 1. settings.json (dengan cadangan)
const settings = readJson(settingsPath); // berhenti dengan error bila JSON rusak, tanpa menimpa apa pun
if (existsSync(settingsPath) && !existsSync(settingsPath + ".bak-sandbox")) copyFileSync(settingsPath, settingsPath + ".bak-sandbox");
settings.hooks ??= {};
const pre = (settings.hooks.PreToolUse ?? []).filter((e) => !isOurs(e));
if (!uninstall) pre.push({ matcher: "Bash|mcp__.*__ctx_execute", hooks: [{ type: "command", command: hookCommand }] });
if (pre.length) settings.hooks.PreToolUse = pre;
else delete settings.hooks.PreToolUse;
if (!Object.keys(settings.hooks).length) delete settings.hooks;
writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");

// 2. skrip hook
if (uninstall) rmSync(hookPath, { force: true });
else copyFileSync(join(here, "require-sandbox.mjs"), hookPath);

// 3. CLAUDE.md tingkat user
let memory = existsSync(memoryPath) ? readFileSync(memoryPath, "utf8") : "";
const start = memory.indexOf(BEGIN);
const stop = memory.indexOf(END);
if (start !== -1 && stop !== -1) memory = (memory.slice(0, start) + memory.slice(stop + END.length)).trimEnd();
if (!uninstall) memory = (memory.trimEnd() ? memory.trimEnd() + "\n\n" : "") + RULES;
writeFileSync(memoryPath, memory ? memory + "\n" : "");

console.log(uninstall ? "Pemaksa sandbox global dilepas." : "Pemaksa sandbox global terpasang.");
console.log("  settings :", settingsPath, existsSync(settingsPath + ".bak-sandbox") ? "(cadangan: settings.json.bak-sandbox)" : "");
console.log("  hook     :", hookPath, `(dijalankan dengan ${runtime})`);
console.log("  aturan   :", memoryPath);
console.log("Buka ulang Claude Code supaya berlaku.");

// Hook PreToolUse global (semua project Claude Code).
// 1. Bash: hanya perintah ringan yang boleh; sisanya wajib lewat sandbox context-mode.
// 2. ctx_execute: perintah yang biasanya ber-output panjang wajib disaring (pipe tail/head/grep, atau `intent`).
// Matikan sementara: set env CTX_SANDBOX_OFF=1 sebelum menjalankan Claude Code.
import { readFileSync } from "node:fs";

if (process.env.CTX_SANDBOX_OFF === "1") process.exit(0);

let input;
try {
  const raw = typeof Bun !== "undefined" ? await Bun.stdin.text() : readFileSync(0, "utf8");
  input = JSON.parse(raw);
} catch {
  process.exit(0); // input tidak terbaca: jangan menghalangi kerja
}
const tool = input?.tool_name ?? "Bash";
const args = input?.tool_input ?? {};

function deny(message) {
  console.error(message);
  process.exit(2);
}

// ---------- 1. Bash ----------
const LIGHT = new Set(["cd", "pwd", "mkdir", "mv", "cp", "touch", "echo", "gofmt", "true"]);
const LIGHT_GIT = new Set([
  "status", "add", "commit", "switch", "checkout", "branch", "restore",
  "stash", "fetch", "pull", "push", "rev-parse", "merge", "rebase", "tag",
]);

function isLight(segment) {
  const words = segment.trim().split(/\s+/).filter((w) => !/^[A-Za-z_]\w*=/.test(w));
  if (words.length === 0) return true;
  const [cmd, sub] = words;
  if (cmd === "git") return LIGHT_GIT.has(sub);
  if (cmd === "cargo") return sub === "fmt";
  return LIGHT.has(cmd);
}

if (tool === "Bash") {
  const command = args.command ?? "";
  const hasSubshell = /\$\(|`|<\(/.test(command);
  if (!hasSubshell && command.split(/&&|\|\||;|\||\n/).every(isLight)) process.exit(0);
  deny(
    "DITOLAK (aturan global): perintah ini harus dijalankan di sandbox context-mode. " +
      "Jalankan ulang lewat tool ctx_execute (atau ctx_batch untuk beberapa perintah) dengan output yang disaring, " +
      "mis. `... 2>&1 | tail -30`. Bash biasa hanya untuk: cd, pwd, mkdir, mv, cp, touch, echo, gofmt, cargo fmt, " +
      "dan git status/add/commit/switch/checkout/branch/restore/stash/fetch/pull/push."
  );
}

// ---------- 2. ctx_execute ----------
if (/ctx_execute$/.test(tool)) {
  // Buang isi heredoc dan teks dalam kutip supaya isi file/pesan commit tidak ikut dinilai.
  const code = (args.code ?? "")
    .replace(/<<-?\s*['"]?(\w+)['"]?[^\n]*\n[\s\S]*?\n\s*\1\s*(\n|$)/g, "<<HEREDOC\n")
    .replace(/'[^']*'|"[^"]*"/g, '""');
  const lang = String(args.language ?? "").toLowerCase();
  if (!["shell", "bash", "sh", "powershell", "pwsh"].includes(lang)) process.exit(0);
  if (args.intent || args.summary) process.exit(0);

  const VERBOSE =
    /\b(cargo\s+(test|build|clippy|check|run)|go\s+(test|build|vet)|make\b|flutter\s+(test|analyze|build|pub)|dart\s+(test|analyze|run)|(npm|pnpm|yarn|bun)\s+(run\s+)?(test|build|lint|install|i|add)\b|pnpm\s+exec|npx\s|tsc\b|eslint\b|pytest\b|gradlew?\b|docker\s+(build|compose)|sqlx\s+migrate|git\s+(diff|log|show)|cat\s+(?![<>])|get-content\s|gc\s)/i;
  const FILTERED =
    /\|\s*(tail|head|grep|rg|wc|findstr|select-string|sls|awk|sed\s+-n|select-object|select\s+-(first|last))\b/i;
  const SHORT_GIT = /git\s+(diff|show)\s[^|;&]*--(stat|shortstat|name-only|name-status|numstat)|git\s+log\s[^|;&]*(-\d+|-n\s*\d+|--max-count)/i;

  if (VERBOSE.test(code) && !FILTERED.test(code) && !SHORT_GIT.test(code)) {
    deny(
      "DITOLAK (aturan global): perintah ini biasanya ber-output panjang dan belum disaring. Jalankan ulang dengan saringan, " +
        "mis. `<perintah> 2>&1 | tail -30` atau `| grep -E \"error|FAILED\" | head -40`, " +
        "atau isi parameter `intent` (mis. \"error dan test gagal saja\"). Untuk git: `git diff --stat`, `git log --oneline -10`. " +
        "Untuk membaca file: `sed -n '40,120p' <file>`, bukan cat seluruh file."
    );
  }
}
process.exit(0);

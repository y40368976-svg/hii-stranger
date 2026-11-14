# Jalankan/matikan layanan lokal. Dipanggil dari .zed/tasks.json.
#   pwsh -NoProfile -File .zed/dev.ps1 start [dev|build]
#   pwsh -NoProfile -File .zed/dev.ps1 stop
param(
    [ValidateSet('start', 'stop', 'pg-start', 'pg-stop')][string]$Action = 'start',
    [ValidateSet('dev', 'build')][string]$Mode = 'dev'
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

function Test-Port([int]$Port) {
    [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Stop-Port([int]$Port) {
    Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

# Satu jendela pwsh per layanan; dilewati bila port sudah dipakai supaya tidak dobel.
function Start-Layanan([string]$Name, [int]$Port, [string]$Dir, [string]$Command) {
    if (Test-Port $Port) { "$Name sudah jalan (port $Port)"; return }
    $cmd = "`$Host.UI.RawUI.WindowTitle = '$Name'; $Command"
    Start-Process pwsh -WorkingDirectory (Join-Path $root $Dir) -ArgumentList '-NoExit', '-NoProfile', '-Command', $cmd | Out-Null
    "$Name dijalankan (port $Port)"
}

$pgBin = Join-Path $env:USERPROFILE 'postgres18\bin\pg_ctl.exe'
$pgData = Join-Path $env:USERPROFILE 'pgdata'
# Log di luar pgdata (kalau di dalam, fsync saat recovery kena sharing violation).
$pgLog = Join-Path $env:USERPROFILE 'pg-server.log'

function Start-Postgres {
    if (Test-Port 5432) { 'postgres sudah jalan (port 5432)'; return }
    # Jendela tersembunyi sendiri: terlepas dari terminal task Zed (Ctrl+C/tutup terminal tidak mematikannya).
    Start-Process $pgBin -ArgumentList '-D', "`"$pgData`"", '-l', "`"$pgLog`"", '-w', '-t', '90', 'start' -WindowStyle Hidden -Wait | Out-Null
    if (Test-Port 5432) { 'postgres dijalankan (port 5432)' } else { "postgres gagal start, lihat $pgLog" }
}

if ($Action -eq 'pg-start') { Start-Postgres; return }
if ($Action -eq 'pg-stop') { & $pgBin -D $pgData -m fast stop 2>&1 | Select-Object -Last 3; 'postgres mati'; return }

if ($Action -eq 'stop') {
    Stop-Port 3000; 'frontend mati'
    Get-Process air -ErrorAction SilentlyContinue | Stop-Process -Force
    Stop-Port 8080; 'backend mati'
    if (Test-Port 6379) { redis-cli -p 6379 shutdown 2>&1 | Out-Null }; 'redis mati'
    return
}

Start-Postgres

if (Test-Port 6379) { 'redis sudah jalan (port 6379)' }
else { Start-Process redis-server -ArgumentList '--port', '6379' -WindowStyle Hidden; 'redis dijalankan (port 6379)' }

if ($Mode -eq 'dev') {
    Start-Layanan 'backend (air)' 8080 'backend' 'air'
    Start-Layanan 'frontend (dev)' 3000 'frontend' 'pnpm dev'
} else {
    Push-Location (Join-Path $root 'backend')
    go build -o api.exe ./cmd/api 2>&1 | Select-Object -Last 20
    $ok = $LASTEXITCODE -eq 0
    Pop-Location
    if (-not $ok) { 'build backend gagal'; exit 1 }
    Start-Layanan 'backend (api.exe)' 8080 'backend' '.\api.exe'
    if (Test-Path (Join-Path $root 'frontend/.next/BUILD_ID')) { Start-Layanan 'frontend (start)' 3000 'frontend' 'pnpm start' }
    else { 'frontend belum di-build: jalankan task "frontend: build" dulu' }
}

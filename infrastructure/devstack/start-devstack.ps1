# ============================================================
# Dailylist local dev stack (Windows, no Docker required)
#
# - PostgreSQL: project-local instance on port 5433 using the
#   binaries of an existing PostgreSQL installation. Does NOT
#   touch the system PostgreSQL service or its data.
# - Redis: portable native Windows build (redis-windows project),
#   downloaded on first run. DEV ONLY — production uses real
#   Redis (see docker-compose.yml / managed Redis).
# ============================================================

$ErrorActionPreference = 'Stop'
$DevstackDir = $PSScriptRoot
$PgData = Join-Path $DevstackDir 'pgdata'
$PgPort = 5433
$RedisDir = Join-Path $DevstackDir 'redis'
$RedisPort = 6379
$RedisVersion = '8.10.1'
$RedisZipUrl = "https://github.com/redis-windows/redis-windows/releases/download/$RedisVersion/Redis-$RedisVersion-Windows-x64-msys2.zip"

# --- Locate PostgreSQL binaries ---
$PgBin = $env:DAILYLIST_PG_BIN
if (-not $PgBin) {
  $candidates = Get-ChildItem 'C:\Program Files\PostgreSQL' -Directory -ErrorAction SilentlyContinue |
    Sort-Object { [int]$_.Name } -Descending
  if ($candidates) { $PgBin = Join-Path $candidates[0].FullName 'bin' }
}
if (-not $PgBin -or -not (Test-Path (Join-Path $PgBin 'pg_ctl.exe'))) {
  Write-Error 'PostgreSQL binaries not found. Install PostgreSQL or set DAILYLIST_PG_BIN to its bin directory.'
}
Write-Host "Using PostgreSQL binaries: $PgBin"

# --- Init project-local cluster (first run only) ---
if (-not (Test-Path (Join-Path $PgData 'PG_VERSION'))) {
  Write-Host 'Initializing project-local PostgreSQL cluster (trust auth, dev only)...'
  & (Join-Path $PgBin 'initdb.exe') -D $PgData -U dailylist -A trust -E UTF8 | Out-Null
}

# --- Start PostgreSQL if not running ---
& (Join-Path $PgBin 'pg_ctl.exe') status -D $PgData *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Starting PostgreSQL on port $PgPort..."
  & (Join-Path $PgBin 'pg_ctl.exe') start -D $PgData -l (Join-Path $DevstackDir 'postgres.log') -o "-p $PgPort" -w
} else {
  Write-Host 'PostgreSQL already running.'
}

# --- Ensure databases exist ---
foreach ($db in @('dailylist_dev', 'dailylist_test')) {
  $exists = & (Join-Path $PgBin 'psql.exe') -U dailylist -h localhost -p $PgPort -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db'"
  if ($exists -ne '1') {
    Write-Host "Creating database $db..."
    & (Join-Path $PgBin 'createdb.exe') -U dailylist -h localhost -p $PgPort $db
  }
}

# --- Download portable Redis (first run only) ---
$RedisExe = Join-Path $RedisDir 'redis-server.exe'
if (-not (Test-Path $RedisExe)) {
  Write-Host "Downloading portable Redis $RedisVersion (dev only)..."
  New-Item -ItemType Directory -Force $RedisDir | Out-Null
  $zip = Join-Path $RedisDir 'redis.zip'
  Invoke-WebRequest -Uri $RedisZipUrl -OutFile $zip -UseBasicParsing
  Expand-Archive -Path $zip -DestinationPath $RedisDir -Force
  # The zip may contain a versioned subfolder; flatten it.
  $inner = Get-ChildItem $RedisDir -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'redis-server.exe') } | Select-Object -First 1
  if ($inner) {
    Get-ChildItem $inner.FullName | Move-Item -Destination $RedisDir -Force
    Remove-Item $inner.FullName -Recurse -Force
  }
  Remove-Item $zip -Force
  if (-not (Test-Path $RedisExe)) { Write-Error 'Redis download/extract failed: redis-server.exe not found.' }
}

# --- Start Redis if not running ---
$redisRunning = Get-NetTCPConnection -LocalPort $RedisPort -State Listen -ErrorAction SilentlyContinue
if (-not $redisRunning) {
  Write-Host "Starting Redis on port $RedisPort..."
  Start-Process -FilePath $RedisExe -ArgumentList "--port $RedisPort --logfile `"$(Join-Path $DevstackDir 'redis.log')`"" -WorkingDirectory $RedisDir -WindowStyle Hidden
  Start-Sleep -Seconds 2
} else {
  Write-Host 'Redis already running.'
}

Write-Host ''
Write-Host 'Dev stack ready:'
Write-Host "  PostgreSQL : postgresql://dailylist@localhost:$PgPort/dailylist_dev"
Write-Host "  Redis      : redis://localhost:$RedisPort"

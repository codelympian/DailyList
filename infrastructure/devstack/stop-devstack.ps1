# Stops the project-local dev stack started by start-devstack.ps1.
$ErrorActionPreference = 'Continue'
$DevstackDir = $PSScriptRoot
$PgData = Join-Path $DevstackDir 'pgdata'

$PgBin = $env:DAILYLIST_PG_BIN
if (-not $PgBin) {
  $candidates = Get-ChildItem 'C:\Program Files\PostgreSQL' -Directory -ErrorAction SilentlyContinue |
    Sort-Object { [int]$_.Name } -Descending
  if ($candidates) { $PgBin = Join-Path $candidates[0].FullName 'bin' }
}

if ($PgBin -and (Test-Path (Join-Path $PgData 'PG_VERSION'))) {
  Write-Host 'Stopping project-local PostgreSQL...'
  & (Join-Path $PgBin 'pg_ctl.exe') stop -D $PgData -m fast
}

$redisCli = Join-Path $DevstackDir 'redis\redis-cli.exe'
if (Test-Path $redisCli) {
  Write-Host 'Stopping Redis...'
  & $redisCli -p 6379 shutdown nosave 2>$null
}

Write-Host 'Dev stack stopped.'

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $repoRoot

try {
  Write-Host "Clearing local D1 tables (connections, shots, films, directors)..."
  npx wrangler d1 execute precept --local --config apps/api/wrangler.toml --command "DELETE FROM connections; DELETE FROM shots; DELETE FROM films; DELETE FROM directors;"

  Write-Host ""
  Write-Host "Verifying row counts..."
  npx wrangler d1 execute precept --local --config apps/api/wrangler.toml --command "SELECT (SELECT COUNT(*) FROM films) AS films, (SELECT COUNT(*) FROM shots) AS shots, (SELECT COUNT(*) FROM connections) AS connections, (SELECT COUNT(*) FROM directors) AS directors;"

  Write-Host ""
  Write-Host "Local D1 reset complete."
}
finally {
  Pop-Location
}

$root = Join-Path $PSScriptRoot ".."

docker build -t pm-app $root
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
docker rm -f pm-app 2>$null | Out-Null

$envFile = Join-Path $root ".env"
$envArgs = if (Test-Path $envFile) { "--env-file", $envFile }

docker run -d --name pm-app -p 8000:8000 -v pm-data:/app/data @envArgs pm-app
Write-Host "Running at http://localhost:8000"

# Prepare deployment archive for Beget
# Run: .\prepare_deploy.ps1

Write-Host "Building frontend..." -ForegroundColor Cyan
Set-Location frontend; npm run build; Set-Location ..

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed" -ForegroundColor Red
    exit 1
}

$distPath = "frontend\dist"
$archiveName = "naymi-tech-deploy.zip"

if (-not (Test-Path $distPath)) {
    Write-Host "frontend\dist not found" -ForegroundColor Red
    exit 1
}

Write-Host "Creating archive..." -ForegroundColor Cyan
$items = Get-ChildItem -Path $distPath -Recurse
$tempDir = "naymi-deploy-temp"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir | Out-Null

foreach ($item in $items) {
    $relativePath = $item.FullName.Substring((Resolve-Path $distPath).Path.Length + 1)
    $destPath = Join-Path $tempDir $relativePath
    if ($item.PSIsContainer) {
        New-Item -ItemType Directory -Path $destPath -Force | Out-Null
    } else {
        $destDir = Split-Path $destPath -Parent
        if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
        Copy-Item $item.FullName -Destination $destPath -Force
    }
}

Compress-Archive -Path "$tempDir\*" -DestinationPath $archiveName -Force
Remove-Item $tempDir -Recurse -Force

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
Write-Host "Archive: $archiveName" -ForegroundColor Yellow
Write-Host ""
Write-Host "Для тикета в поддержку Beget:" -ForegroundColor Cyan
Write-Host "  1. Приложите: $archiveName, ИНСТРУКЦИЯ_ДЛЯ_BEGET.txt"
Write-Host "  2. Домен: naymi.tech"
Write-Host "  3. Подробности: ПЕРЕДАТЬ_В_ПОДДЕРЖКУ_BEGET.md"

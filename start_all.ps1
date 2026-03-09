# Запуск Найми (локальная разработка)
# Один хост: backend + frontend; AI — опционально

$ErrorActionPreference = "Stop"
Write-Host "Найми — запуск локально" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Установите Node.js: https://nodejs.org/" -ForegroundColor Red
    exit 1
}

Write-Host "Backend (порт 4000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev"
Start-Sleep -Seconds 2

Write-Host "Frontend (порт 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "Откройте: http://localhost:3000" -ForegroundColor Green
Write-Host "API: http://localhost:4000/health" -ForegroundColor Gray
Write-Host "Логин: admin@crm.ru / admin" -ForegroundColor Gray
Write-Host ""
Write-Host "AI-матчинг (опционально): cd ai; python app.py (порт 8001). Затем в backend .env задайте AI_SERVICE_URL=http://localhost:8001" -ForegroundColor Gray

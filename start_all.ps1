# Запуск Найми (локальная разработка)
# Backend при старте сам запускает AI-сервис (порт 8001)

$ErrorActionPreference = "Stop"
Write-Host "Найми — запуск локально" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Установите Node.js: https://nodejs.org/" -ForegroundColor Red
    exit 1
}

Write-Host "Backend (порт 4000) + AI-сервис (8001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev"
Start-Sleep -Seconds 2

Write-Host "Frontend (порт 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "Откройте: http://localhost:3000" -ForegroundColor Green
Write-Host "API: http://localhost:4000/health | AI: http://localhost:8001 (запускается с backend)" -ForegroundColor Gray
Write-Host "Логин: admin@crm.ru / admin" -ForegroundColor Gray

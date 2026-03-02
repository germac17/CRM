# Скрипт для запуска всей системы Найми

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "           Найми - Запуск всей системы                        " -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Проверка Node.js
Write-Host "[1/4] Проверка Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Node.js установлен: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "  ✗ Node.js не найден. Установите: https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Проверка Python
Write-Host "[2/4] Проверка Python..." -ForegroundColor Yellow
$pythonVersion = python --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Python установлен: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "  ✗ Python не найден. Установите: https://python.org/" -ForegroundColor Red
    exit 1
}

# Проверка зависимостей AI
Write-Host "[3/4] Проверка AI-зависимостей..." -ForegroundColor Yellow
cd ai
$pydanticCheck = python -c "import pydantic" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ AI-зависимости установлены" -ForegroundColor Green
} else {
    Write-Host "  ⚠ AI-зависимости не найдены. Установка..." -ForegroundColor Yellow
    python -m pip install -r requirements.txt
    python -m spacy download ru_core_news_md
    Write-Host "  ✓ AI-зависимости установлены" -ForegroundColor Green
}
cd ..

# Информация
Write-Host "[4/4] Подготовка к запуску..." -ForegroundColor Yellow
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Система будет запущена в 3 терминалах:                     " -ForegroundColor Cyan
Write-Host "  1. Backend API (порт 4000)                                  " -ForegroundColor Cyan
Write-Host "  2. AI Service (порт 8001)                                   " -ForegroundColor Cyan
Write-Host "  3. Frontend (порт 3000)                                     " -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "Нажмите Enter для запуска или Ctrl+C для отмены..."
Read-Host

# Запуск Backend
Write-Host ""
Write-Host "🚀 Запуск Backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev"
Start-Sleep -Seconds 2

# Запуск AI Service
Write-Host "🤖 Запуск AI Service..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\ai'; `$env:PYTHONIOENCODING='utf-8'; python app.py"
Start-Sleep -Seconds 3

# Запуск Frontend
Write-Host "🎨 Запуск Frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✅ Все сервисы запущены!                                    " -ForegroundColor Green
Write-Host ""
Write-Host "  Подождите 10-15 секунд, затем откройте:                     " -ForegroundColor Cyan
Write-Host ""
Write-Host "  🌐 Frontend:  http://localhost:3000                         " -ForegroundColor White
Write-Host "  🔧 Backend:   http://localhost:4000/health                  " -ForegroundColor White
Write-Host "  🤖 AI Service: http://localhost:8001/docs                   " -ForegroundColor White
Write-Host ""
Write-Host "  Логин: admin@crm.ru                                         " -ForegroundColor Yellow
Write-Host "  Пароль: admin                                               " -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Для остановки закройте все терминалы или нажмите Ctrl+C в каждом" -ForegroundColor Gray
Write-Host ""

# Ожидание перед открытием браузера
Start-Sleep -Seconds 15

# Открытие браузера
Write-Host "🌐 Открываю браузер..." -ForegroundColor Green
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "✨ Готово! Система запущена и работает!" -ForegroundColor Green
Write-Host ""

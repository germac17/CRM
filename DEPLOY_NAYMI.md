# Развёртывание Найми на naymi.tech

## Подготовка

1. **Сборка:**
   ```bash
   npm run build
   ```
   Собирает фронтенд в `frontend/dist` и бэкенд в `backend/dist`.

2. **Переменные окружения** (backend/.env):
   ```
   NODE_ENV=production
   PORT=4000
   SUPABASE_URL=...
   SUPABASE_KEY=...
   AI_SERVICE_URL=http://localhost:8001
   ```

## Развёртывание на Beget

1. **Прилинкуйте домен** в панели Beget: раздел «Сайты» → привязка naymi.tech к директории.

2. **Загрузите файлы:**
   - Содержимое `backend/` (включая `dist/`, `node_modules/`, `package.json`)
   - Папка `frontend/dist/` должна быть рядом с backend (структура: `backend/`, `frontend/dist/`)

3. **Запуск Node.js** (если Beget поддерживает):
   ```bash
   cd backend
   NODE_ENV=production node dist/server.js
   ```

4. **Прокси/настройка веб-сервера:** направьте трафик с naymi.tech на порт, где работает Node (например, 4000).

## Альтернатива: VPS / свой сервер

```bash
# Сборка
npm run build

# Запуск (PM2 или systemd)
cd backend
NODE_ENV=production PORT=80 node dist/server.js
```

Nginx (если используется):
```nginx
server {
    listen 80;
    server_name naymi.tech www.naymi.tech;
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Проверка

После развёртывания:
- https://naymi.tech — интерфейс приложения
- https://naymi.tech/health — проверка API

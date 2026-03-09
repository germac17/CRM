# Развёртывание на одном хосте

Приложение рассчитано на один сервер: backend отдаёт API и собранный фронтенд, база — Supabase (облако) или своя PostgreSQL.

## 1. Подготовка

- Node.js 18+
- Аккаунт [Supabase](https://supabase.com) (или своя БД)

## 2. База данных

В [Supabase](https://supabase.com) создайте проект и выполните миграции из `backend/migrations/` в порядке имён (001, 002, 003, …).  
Скопируйте **Project URL** и **service_role key** в `.env` backend.

## 3. Настройка backend

В папке `backend` создайте `.env` (по образцу `.env.example`):

```env
PORT=4000
NODE_ENV=production
SUPABASE_URL=https://ваш-проект.supabase.co
SUPABASE_KEY=ваш_service_role_ключ

# Один хост: ваш домен или http://IP:4000
APP_URL=https://ваш-домен.ru
BACKEND_URL=https://ваш-домен.ru

# Опционально: AI-матчинг (если поднимаете отдельно)
AI_SERVICE_URL=

FEATURE_EMAIL_VERIFICATION=false
FEATURE_TARIFFS=true
```

При необходимости настройте SMTP (MAIL_*).

## 4. Сборка фронтенда

```bash
cd frontend
npm ci
npm run build
```

В `frontend/.env.production` задайте `VITE_API_URL=https://ваш-домен.ru` (или оставьте пустым, если API на том же домене).

## 5. Запуск на сервере

Backend в production отдаёт статику из `frontend/dist`, если эта папка есть относительно backend.

```bash
cd backend
npm ci
npm run build
npm start
```

Либо соберите фронт в `backend/../frontend/dist` и запускайте backend с `NODE_ENV=production` — приложение будет доступно на `http://сервер:4000`.

## 6. Прокси (Nginx и т.п.)

При использовании Nginx настройте прокси на порт 4000:

```nginx
server {
    listen 80;
    server_name ваш-домен.ru;
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

После получения SSL замените `listen 80` на `listen 443 ssl` и укажите сертификаты.

## Локальная разработка

```powershell
.\start_all.ps1
```

Или вручную: в трёх терминалах — `backend` (npm run dev), `frontend` (npm run dev), при необходимости `ai` (python app.py).  
Логин по умолчанию: **admin@crm.ru** / **admin**.

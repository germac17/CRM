# Развёртывание на одном хосте

Приложение рассчитано на один сервер: backend отдаёт API и собранный фронтенд. По умолчанию данные хранятся в JSON (`backend/data/`). При деплое можно подключить PostgreSQL.

## 1. Подготовка

- Node.js 18+

## 2. База данных

По умолчанию используется JSON-хранилище в `backend/data/`. Для production можно использовать PostgreSQL — выполните миграции из `backend/migrations/` в порядке имён (001, 002, 003, …).

## 3. Настройка backend

В папке `backend` создайте `.env` (по образцу `.env.example`):

```env
PORT=4000
NODE_ENV=production

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

### Фронт на Vercel, API на другом хосте

- **Адрес сайта на Vercel** (пример): `https://crm-jfsix03d2-germac17s-projects.vercel.app` — это **не** URL API.
- В **Vercel → Settings → Environment Variables** для сборки задайте **`VITE_API_URL`** = публичный URL вашего **backend** (где открыт порт API, например `https://api.ваш-домен.ru`).
- В **`.env` на сервере с backend** укажите **`APP_URL`** = URL фронта на Vercel (без `/` в конце), чтобы CORS и редиректы после верификации работали. Несколько доменов (production + preview): перечислите через запятую в `APP_URL`.
- Отдельно задайте **`BACKEND_URL`** = публичный URL API, если он отличается от `APP_URL` (нужно для ссылок в письмах).

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

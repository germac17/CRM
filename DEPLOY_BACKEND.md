# Развёртывание Backend API для naymi.tech

Backend (Node.js + Express) нужно разместить на хостинге с поддержкой Node.js. Ниже — пошаговые инструкции для **Render** и **Railway**.

---

## Переменные окружения

Перед развёртыванием подготовьте:

| Переменная | Описание | Пример |
|------------|----------|--------|
| `SUPABASE_URL` | URL проекта Supabase | `https://xxx.supabase.co` |
| `SUPABASE_KEY` | Service Role Key из Supabase | `eyJhbG...` |
| `NODE_ENV` | Режим | `production` |
| `AI_SERVICE_URL` | URL AI-сервиса (опционально) | `https://...` или пусто |

---

## Вариант 1: Render (бесплатный тариф)

### Шаг 1. Регистрация и репозиторий

1. Зарегистрируйтесь на [render.com](https://render.com) (через GitHub).
2. Убедитесь, что проект в Git (GitHub, GitLab и т.п.).

### Шаг 2. Создание Web Service

1. В [Render Dashboard](https://dashboard.render.com) нажмите **New → Web Service**.
2. Подключите репозиторий с проектом.
3. Настройки:
   - **Name:** `naymi-api`
   - **Region:** Frankfurt (или ближайший)
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`

### Шаг 3. Переменные окружения

В разделе **Environment** добавьте:

```
NODE_ENV=production
SUPABASE_URL=https://ваш-проект.supabase.co
SUPABASE_KEY=ваш_service_role_key
AI_SERVICE_URL=
```

`AI_SERVICE_URL` можно оставить пустым, если AI-матчинг пока не используется.

### Шаг 4. Деплой

Нажмите **Create Web Service**. После сборки сервис получит URL вида:

```
https://naymi-api-xxxx.onrender.com
```

Проверка: `https://naymi-api-xxxx.onrender.com/health` должен вернуть JSON.

### Шаг 5. Подключение фронтенда

1. Откройте `frontend/.env.production`.
2. Укажите URL API:

```
VITE_API_URL=https://naymi-api-xxxx.onrender.com
```

3. Пересоберите фронтенд и загрузите на Beget:

```powershell
.\prepare_deploy.ps1
```

---

## Вариант 2: Railway

### Шаг 1. Регистрация

1. Зарегистрируйтесь на [railway.app](https://railway.app).
2. Подключите GitHub.

### Шаг 2. Новый проект

1. Нажмите **New Project**.
2. Выберите **Deploy from GitHub repo** и укажите репозиторий.
3. В настройках сервиса:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`

### Шаг 3. Переменные окружения

В **Variables** добавьте:

```
NODE_ENV=production
SUPABASE_URL=https://ваш-проект.supabase.co
SUPABASE_KEY=ваш_service_role_key
AI_SERVICE_URL=
```

### Шаг 4. Домен

1. В **Settings → Networking** нажмите **Generate Domain**.
2. Получите URL вида `https://naymi-api-production-xxxx.up.railway.app`.

### Шаг 5. Подключение фронтенда

В `frontend/.env.production` укажите:

```
VITE_API_URL=https://naymi-api-production-xxxx.up.railway.app
```

Пересоберите фронтенд и загрузите на Beget.

---

## Вариант 3: Свой домен api.naymi.tech

Если хотите использовать `https://api.naymi.tech`:

### Render

1. В **Settings → Custom Domains** добавьте `api.naymi.tech`.
2. В DNS вашего домена создайте CNAME:
   - **Имя:** `api`
   - **Значение:** `naymi-api-xxxx.onrender.com` (ваш URL из Render)

### Railway

1. В **Settings → Domains** добавьте `api.naymi.tech`.
2. В DNS создайте CNAME: `api` → `naymi-api-production-xxxx.up.railway.app`.

После настройки DNS в `frontend/.env.production` укажите:

```
VITE_API_URL=https://api.naymi.tech
```

---

## Проверка

После развёртывания:

```bash
# Health check
curl https://ваш-api-url/health

# Регистрация (должен вернуть JSON, не HTML)
curl -X POST https://ваш-api-url/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456","name":"Test"}'
```

---

## Важно

- **Render Free Tier:** сервис «засыпает» после ~15 минут неактивности. Первый запрос может занимать 30–60 секунд.
- **Railway:** есть бесплатный лимит, после него требуется оплата.
- **Supabase:** ключи берите в [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API.

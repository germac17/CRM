# Развёртывание AI-матчинга для naymi.tech

AI-сервис (Python/FastAPI) выполняет матчинг кандидатов и вакансий. Для работы на удалённом сайте его нужно развернуть и подключить к backend.

## Что сделано

- **Backend** получает данные из Supabase и передаёт их в AI-сервис (без локальных файлов)
- **AI-сервис** принимает vacancy + candidates в теле запроса (`/api/match/batch-with-data`, `/api/match/analyze-with-data`)
- Работает в любом deployment (Render, Railway, VPS)

---

## Вариант 1: Render (рекомендуется)

### Если backend уже на Render

1. В [Render Dashboard](https://dashboard.render.com) создайте **New → Web Service**
2. Подключите тот же репозиторий
3. Настройки:
   - **Name:** `naymi-ai`
   - **Root Directory:** `ai`
   - **Runtime:** Python
   - **Build Command:** `pip install -r requirements.txt && python -m spacy download ru_core_news_md`
   - **Start Command:** `uvicorn app:app --host 0.0.0.0 --port $PORT`

4. После деплоя скопируйте URL (например `https://naymi-ai-xxxx.onrender.com`)

5. В настройках **naymi-api** (backend) добавьте переменную:
   ```
   AI_SERVICE_URL=https://naymi-ai-xxxx.onrender.com
   ```
6. Сделайте **Manual Deploy** для backend, чтобы применить новую переменную

### Важно

- **Build time:** первый деплой может занять 10–15 минут (sentence-transformers, spaCy)
- **Free tier:** сервис «засыпает» после неактивности; первый запрос может быть медленным (30–60 сек)

---

## Вариант 2: Blueprint (оба сервиса из одного репозитория)

Если в корне есть `render.yaml` с обоими сервисами:

1. В Dashboard: **New → Blueprint** → выберите репозиторий
2. Render создаст `naymi-api` и `naymi-ai`
3. После деплоя `naymi-ai` скопируйте его URL
4. В `naymi-api` → **Environment** добавьте:
   ```
   AI_SERVICE_URL=https://naymi-ai-xxxx.onrender.com
   ```
5. Запустите redeploy `naymi-api`

---

## Проверка

```bash
# Health AI-сервиса
curl https://naymi-ai-xxxx.onrender.com/health

# Матчинг (через backend, с авторизацией)
curl -X POST https://ваш-backend/ai/match/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vacancy_id":"vac-xxx","auto_save":false}'
```

---

## Ошибка «AI-матчинг недоступен»

Если при запросе матчинга приходит 503:

1. Проверьте, что `AI_SERVICE_URL` задан в backend
2. Убедитесь, что AI-сервис запущен: `curl https://naymi-ai-xxxx.onrender.com/health`
3. На Render Free Tier дождитесь «пробуждения» (первый запрос может идти до минуты)

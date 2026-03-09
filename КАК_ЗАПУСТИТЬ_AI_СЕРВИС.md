# Как получить URL AI-сервиса (для ИИ-матчинга)

Backend возвращает 503, пока не знает адрес AI-сервиса. Нужно развернуть AI-сервис и прописать его URL в настройках backend.

---

## Шаг 1: Развернуть AI-сервис на Render

1. Откройте **[dashboard.render.com](https://dashboard.render.com)** и войдите в аккаунт (тот же, где развёрнут backend).

2. Нажмите **«New +»** → **«Web Service»**.

3. Подключите **тот же репозиторий**, что и для backend (GitHub/GitLab с проектом CRM).

4. Заполните настройки:

   | Поле | Значение |
   |------|----------|
   | **Name** | `naymi-ai` |
   | **Region** | Frankfurt (или ближайший) |
   | **Root Directory** | `ai` |
   | **Runtime** | Python |
   | **Build Command** | `pip install -r requirements.txt && python -m spacy download ru_core_news_md` |
   | **Start Command** | `uvicorn app:app --host 0.0.0.0 --port $PORT` |

5. Нажмите **«Create Web Service»**.

6. Дождитесь окончания сборки (первый раз может занять **10–15 минут** из‑за загрузки моделей). Статус должен стать **Live**.

7. Вверху страницы сервиса скопируйте **URL**, например:
   ```text
   https://naymi-ai-xxxx.onrender.com
   ```
   Это и есть **URL AI-сервиса**.

---

## Шаг 2: Прописать URL в backend

1. В Render откройте сервис **naymi-api** (ваш backend).

2. Слева выберите **Environment**.

3. Нажмите **«Add Environment Variable»** и добавьте:
   - **Key:** `AI_SERVICE_URL`
   - **Value:** `https://naymi-ai-xxxx.onrender.com` (подставьте свой URL из шага 1).

4. Сохраните и нажмите **«Manual Deploy»** → **«Deploy latest commit»**, чтобы backend перезапустился с новой переменной.

---

## Шаг 3: Проверка

1. В браузере откройте:
   ```text
   https://ваш-naymi-ai-url.onrender.com/health
   ```
   Должен вернуться JSON вида: `{"status":"ok","service":"hr-crm-ai",...}`.

2. На сайте Найми откройте раздел **«ИИ матчинг»**, выберите вакансию и нажмите **«Запустить AI-анализ»**. Ошибка 503 должна пропасть.

---

## Важно

- На **бесплатном тарифе** Render сервис «засыпает» после ~15 минут без запросов. Первый запрос после этого может выполняться **30–60 секунд** — это нормально.
- Если сборка AI-сервиса падает с ошибкой памяти, в настройках сервиса можно попробовать увеличить **Instance Type** (на платном плане).

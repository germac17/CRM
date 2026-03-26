# План внедрения: монетизация, AI-матчинг, верификация

**Проект:** Найми (naymi.tech)  
**Стек:** React, Node.js/Express, JSON/PostgreSQL, Python AI  
**Статус:** Production, три блока доработок

---

## Блок 1: Монетизация через тарифные планы

### 1.1 Сущности и миграции

| Миграция | Таблицы | Описание |
|----------|---------|----------|
| 002_plans | `plans` | Тарифные планы |
| 003_user_plan | `user_plans`, `subscriptions` | Связь user ↔ plan, состояния |

**Таблица `plans`:**
```sql
- id (uuid, PK)
- name (text) — "Free", "Starter", "Pro", "Enterprise"
- slug (text, unique) — free, starter, pro, enterprise
- price_monthly (decimal)
- price_yearly (decimal, nullable)
- limit_vacancies (int) — 3, 30, -1 = ∞
- limit_candidates (int) — 100, 5000, -1 = ∞
- ai_matching_enabled (boolean)
- limit_users (int)
- priority_support (boolean)
- integrations_allowed (jsonb) — ["hh", "telegram", "google_calendar"]
- hidden (boolean) — для кастомных клиентов
```

**Таблица `subscriptions`:**
```sql
- id (uuid, PK)
- user_id (uuid, FK → auth.users)
- plan_id (uuid, FK)
- status (enum: trial, active, payment_overdue, blocked)
- trial_ends_at (timestamptz, nullable)
- current_period_ends_at (timestamptz)
- created_at, updated_at
```

### 1.2 Feature flag

`FEATURE_TARIFFS=true` в `.env` — включать/выключать проверку тарифов.

### 1.3 Сценарии

- **Регистрация** → автоматически `subscription` со статусом `trial`, `plan_id=free` (или trial-plan), `trial_ends_at = now() + 14 days`
- **Окончание trial** → cron/worker переводит в `plan_id=free`, `status=active`
- **Просрочка оплаты** → `payment_overdue`, grace 3–7 дней, затем `blocked`
- **Проверка в коде** — middleware `checkPlanAbility(ability: 'ai_matching' | 'integrations' | 'vacancies_limit')`

### 1.4 UI

- `/pricing` — публичная страница с тарифами
- Личный кабинет → «Тариф и оплата» (текущий план, upgrade, история)

### 1.5 Платёжный шлюз

- Рекомендация: **ЮKassa** или **CloudPayments**
- Webhook для подтверждения оплаты → обновление `subscriptions`
- Тестовый режим через `PAYMENT_SANDBOX=true`

---

## Блок 2: Постоянная работа AI-матчинга

### 2.1 Архитектура

```
Supabase DB triggers / Edge Functions
        ↓
  Supabase → webhook → Backend / Queue
        ↓
  BullMQ (Redis) или pg_cron + worker
        ↓
  Backend → AI Service (batch-with-data)
        ↓
  Сохранение в matches
        ↓
  Уведомления (если score > 85%)
```

### 2.2 Варианты реализации

| Вариант | Плюсы | Минусы |
|---------|-------|--------|
| **Supabase Edge Functions + pg_cron** | Без доп. инфраструктуры | Ограничения по времени выполнения |
| **BullMQ + Redis (на Render/Railway)** | Гибко, retry, приоритеты | Нужен Redis |
| **Отдельный worker (Python/Node)** | Простота | Доп. сервис |
| **Supabase pg_net + HTTP webhook** | Минимальные изменения | Зависимость от Supabase |

**Рекомендация:** BullMQ + Redis. Redis можно добавить на Render или использовать Upstash (serverless Redis).

### 2.3 Триггеры

1. **При добавлении/изменении вакансии** → job `match-vacancy:{vacancy_id}` → матчинг по всей базе кандидатов → сохранить топ-50
2. **При добавлении кандидата/резюме** → job `match-candidate:{candidate_id}` → поиск подходящих вакансий → топ-N
3. **Cron (24–48 ч)** → job `recalculate-all` → переоценка активных вакансий и свежих резюме

### 2.4 Уведомления

- Email (через SMTP из блока 3)
- In-app (таблица `notifications`, badge в UI)
- Telegram (опционально, через bot API)

**Условие:** `score >= 0.85` (85–90%) → создаём уведомление.

### 2.5 Ограничение по тарифу

- На `free` — фоновый матчинг **отключён** (только по запросу)
- На платных тарифах — фоновый матчинг включён

---

## Блок 3: Регистрация с подтверждением email

### 3.1 Миграция

```sql
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
-- Или отдельная таблица verification_tokens
CREATE TABLE verification_tokens (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  token text UNIQUE,
  expires_at timestamptz,
  used_at timestamptz
);
```

**Примечание:** Supabase Auth имеет встроенный `email_confirmed_at`. Возможные варианты:
- Использовать Supabase Auth `signUp` с `emailRedirectTo` и кастомным шаблоном письма
- Либо кастомная таблица `users` + свои токены (если auth кастомная)

### 3.2 Текущая схема

- Таблица `users`: `id`, `name`, `email`, `password`, `created_at`
- Кастомная auth: токен = base64(email:password), без Supabase Auth
- При регистрации пользователь сразу получает токен и авторизуется

### 3.3 Поток

1. POST `/auth/register` → создаём user с `email_verified_at = null`
2. Генерируем `token` (uuid или 6 цифр), сохраняем в `verification_tokens`, `expires_at = now() + 48h`
3. Отправляем письмо (Nodemailer + SMTP)
4. GET `/auth/verify?token=xxx` → проверяем токен, ставим `email_verified_at`, удаляем токен
5. При `/auth/login` — проверяем `email_verified_at`; если null → 403 «Подтвердите email»

### 3.4 Конфиг .env

```env
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=support@naymi.tech
MAIL_PASSWORD=...
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=support@naymi.tech
MAIL_FROM_NAME="Naymi HR"
```

---

## Общие требования

### Feature flags

```env
FEATURE_TARIFFS=false
FEATURE_AI_BACKGROUND=false
FEATURE_EMAIL_VERIFICATION=false
```

### Логирование

- Структурированные логи (JSON) для: регистрация, верификация, смена тарифа, запуск матчинга, ошибки отправки почты
- Интеграция с Sentry или аналогом

### Миграции

- Каждая миграция — отдельный файл `00X_description.sql`
- Файл отката `00X_description_down.sql`

### Приоритизация

| Приоритет | Блок | Сложность | Зависимости |
|-----------|------|-----------|-------------|
| 1 | Блок 3 (Верификация) | Средняя | SMTP, email templates |
| 2 | Блок 1 (Тарифы) | Высокая | Миграции, UI, платежи |
| 3 | Блок 2 (AI background) | Высокая | Redis/очередь, worker |

### Рекомендуемый порядок

1. **Блок 3** — верификация (независимый, улучшает качество регистраций)
2. **Блок 1** — тарифы (основа для монетизации и ограничения AI)
3. **Блок 2** — фоновый AI (зависит от тарифов для ограничения)

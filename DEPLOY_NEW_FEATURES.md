# Развёртывание новых функций (Блоки 1 и 3)

## Миграции

Выполните в Supabase Dashboard → SQL Editor в порядке:

1. `backend/migrations/002_email_verification.sql`
2. `backend/migrations/003_plans_subscriptions.sql`
3. `backend/migrations/004_notifications.sql`

## Feature flags (backend .env)

```env
FEATURE_EMAIL_VERIFICATION=false
FEATURE_TARIFFS=false
FEATURE_AI_BACKGROUND=false
```

Включите по мере готовности:
- `FEATURE_EMAIL_VERIFICATION=true` — требует SMTP
- `FEATURE_TARIFFS=true` — тарифы и лимиты

## Email (для верификации)

```env
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=support@naymi.tech
MAIL_PASSWORD=...
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=support@naymi.tech
MAIL_FROM_NAME=Naymi HR
APP_URL=https://naymi.tech
API_PUBLIC_URL=https://ваш-backend.onrender.com
```

## Блок 2 (AI background)

См. `docs/BLOCK2_AI_BACKGROUND.md` — требуется Redis и отдельный worker.

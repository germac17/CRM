-- Блок 1: Тарифные планы
-- Feature: FEATURE_TARIFFS

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  price_monthly DECIMAL(12,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(12,2),
  limit_vacancies INT NOT NULL DEFAULT 3,
  limit_candidates INT NOT NULL DEFAULT 100,
  ai_matching_enabled BOOLEAN NOT NULL DEFAULT false,
  limit_users INT NOT NULL DEFAULT 1,
  priority_support BOOLEAN DEFAULT false,
  integrations_allowed JSONB DEFAULT '[]',
  hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'payment_overdue', 'blocked')),
  trial_ends_at TIMESTAMPTZ,
  current_period_ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

-- 3 тарифных плана с разным функционалом
INSERT INTO plans (name, slug, price_monthly, price_yearly, limit_vacancies, limit_candidates, ai_matching_enabled, limit_users, priority_support, hidden)
VALUES
  ('Базовый', 'free', 0, 0, 3, 50, false, 1, false, false),
  ('Старт', 'starter', 990, 9504, 15, 300, true, 3, false, false),
  ('Про', 'pro', 3990, 38270, -1, 2000, true, 10, true, false)
ON CONFLICT (slug) DO NOTHING;

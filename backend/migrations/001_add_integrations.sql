-- Миграция: интеграции и поле source
-- Запустите в Supabase SQL Editor если таблицы уже существуют

-- Добавить source в vacancies и candidates (если колонки нет)
ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Таблица integrations (если ещё не создана)
CREATE TABLE IF NOT EXISTS integrations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  api_key_encrypted TEXT,
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connected', 'syncing', 'error')),
  last_sync_at TIMESTAMPTZ,
  UNIQUE(user_id, service)
);

CREATE INDEX IF NOT EXISTS idx_integrations_user ON integrations(user_id);

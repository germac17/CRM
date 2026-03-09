-- Блок 2: Уведомления о релевантных совпадениях
-- Feature: FEATURE_AI_BACKGROUND

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'match',
  title TEXT NOT NULL,
  body TEXT,
  vacancy_id TEXT,
  candidate_id TEXT,
  score NUMERIC,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read_at);

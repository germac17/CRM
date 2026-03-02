-- =============================================
-- Найми - Supabase Schema
-- Запустите этот SQL в Supabase Dashboard → SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vacancies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  department TEXT DEFAULT '',
  location TEXT DEFAULT '',
  status TEXT DEFAULT 'open',
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  role TEXT DEFAULT '',
  skills JSONB DEFAULT '[]',
  stage TEXT DEFAULT 'Скрининг',
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL,
  vacancy_id TEXT NOT NULL,
  score NUMERIC DEFAULT 0,
  explanation TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT DEFAULT '',
  date TEXT DEFAULT '',
  time TEXT DEFAULT '',
  participants TEXT DEFAULT '',
  status TEXT DEFAULT 'Запланировано',
  candidate_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS communications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT DEFAULT 'Email',
  template TEXT DEFAULT '',
  audience TEXT DEFAULT '',
  status TEXT DEFAULT 'Запланировано',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT DEFAULT '',
  sender TEXT CHECK (sender IN ('user', 'support')) DEFAULT 'user',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integrations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  api_key_encrypted TEXT,
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connected', 'syncing', 'error')),
  last_sync_at TIMESTAMPTZ,
  UNIQUE(user_id, service)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_vacancies_user ON vacancies(user_id);
CREATE INDEX IF NOT EXISTS idx_candidates_user ON candidates(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_user ON matches(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_user ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_communications_user ON communications(user_id);
CREATE INDEX IF NOT EXISTS idx_support_user ON support_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_user ON integrations(user_id);

-- Отключаем RLS (бэкенд сам проверяет авторизацию и фильтрует по user_id)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Разрешаем все операции для anon ключа (бэкенд сам контролирует доступ)
DROP POLICY IF EXISTS "Allow all for anon" ON users;
DROP POLICY IF EXISTS "Allow all for anon" ON vacancies;
DROP POLICY IF EXISTS "Allow all for anon" ON candidates;
DROP POLICY IF EXISTS "Allow all for anon" ON matches;
DROP POLICY IF EXISTS "Allow all for anon" ON calendar_events;
DROP POLICY IF EXISTS "Allow all for anon" ON communications;
DROP POLICY IF EXISTS "Allow all for anon" ON support_messages;
DROP POLICY IF EXISTS "Allow all for anon" ON integrations;

CREATE POLICY "Allow all for anon" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON vacancies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON candidates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON calendar_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON communications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON support_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON integrations FOR ALL USING (true) WITH CHECK (true);

-- Вставляем администратора
INSERT INTO users (id, name, email, password) VALUES ('usr-admin', 'Администратор', 'admin@crm.ru', 'admin')
ON CONFLICT (id) DO NOTHING;

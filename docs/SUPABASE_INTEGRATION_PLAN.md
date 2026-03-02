# Пошаговый план подключения HR CRM к Supabase

## Важно о безопасности

**Не храните API ключи в коде!** Используйте переменные окружения (`.env`). Ключ `sb_publishable_...` — это анонимный ключ для клиента. Для бэкенда лучше использовать **service_role** ключ (в Supabase Dashboard → Settings → API).

---

## Шаг 1: Создание проекта и таблиц в Supabase

### 1.1 Откройте Supabase Dashboard

1. Перейдите на https://supabase.com/dashboard  
2. Войдите в свой проект: https://hbbvkfozxnaqndeizxwn.supabase.co  
3. Откройте **SQL Editor**

### 1.2 Выполните SQL для создания таблиц

```sql
-- Пользователи (можно позже заменить на Supabase Auth)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Вакансии (с привязкой к пользователю)
CREATE TABLE vacancies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  department TEXT,
  location TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Кандидаты
CREATE TABLE candidates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  skills JSONB DEFAULT '[]',
  stage TEXT DEFAULT 'Скрининг',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Матчи (связь кандидат-вакансия)
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL,
  vacancy_id TEXT NOT NULL,
  score NUMERIC,
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Календарь
CREATE TABLE calendar_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  date TEXT,
  time TEXT,
  participants TEXT,
  status TEXT DEFAULT 'Запланировано',
  candidate_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Коммуникации
CREATE TABLE communications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT,
  template TEXT,
  audience TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Чат поддержки
CREATE TABLE support_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  sender TEXT CHECK (sender IN ('user', 'support')),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрого поиска по user_id
CREATE INDEX idx_vacancies_user ON vacancies(user_id);
CREATE INDEX idx_candidates_user ON candidates(user_id);
CREATE INDEX idx_matches_user ON matches(user_id);
CREATE INDEX idx_calendar_user ON calendar_events(user_id);
CREATE INDEX idx_communications_user ON communications(user_id);
CREATE INDEX idx_support_user ON support_messages(user_id);

-- RLS можно включить позже. С service_role ключом бэкенд обходит RLS.
-- Фильтрация по user_id выполняется в коде приложения.
```

> **Примечание:** RLS с `current_setting` требует передачи `user_id` в каждом запросе. Проще на первом этапе отключить RLS и фильтровать по `user_id` в коде бэкенда.

---

## Шаг 2: Установка зависимостей в бэкенде

```bash
cd backend
npm install @supabase/supabase-js
```

---

## Шаг 3: Переменные окружения

Создайте файл `backend/.env`:

```env
PORT=4000
SUPABASE_URL=https://hbbvkfozxnaqndeizxwn.supabase.co
SUPABASE_SERVICE_KEY=ваш_service_role_ключ_из_dashboard
```

> **Где взять ключи:** Supabase Dashboard → Project Settings → API  
> - `Project URL` → `SUPABASE_URL`  
> - `service_role` (secret) → `SUPABASE_SERVICE_KEY` — для бэкенда  
> - `anon` (public) → только для клиентского кода, если будете вызывать Supabase с фронта

**Добавьте `.env` в `.gitignore`** (уже должно быть).

---

## Шаг 4: Создание клиента Supabase в бэкенде

Создайте файл `backend/src/supabase.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  throw new Error("SUPABASE_URL и SUPABASE_SERVICE_KEY должны быть заданы в .env");
}

export const supabase = createClient(url, key);
```

---

## Шаг 5: Замена файлового хранилища на Supabase

Нужно заменить функции `loadUserData` и `saveUserData` на запросы к Supabase. Пример для `vacancies`:

**Было (файлы):**
```typescript
const vacancies = await loadUserData<Vacancy>(userId, "vacancies");
```

**Станет (Supabase):**
```typescript
const { data: vacancies } = await supabase
  .from("vacancies")
  .select("*")
  .eq("user_id", userId);
```

Аналогично для `candidates`, `matches`, `calendar_events`, `communications`, `support_messages`.

---

## Шаг 6: Миграция пользователей

Таблица `users` — заменить `loadUsers`/`saveUsers`:

```typescript
const loadUsers = async () => {
  const { data } = await supabase.from("users").select("*");
  return data ?? [];
};

const saveUsers = async (users: User[]) => {
  // Для каждого пользователя: upsert
  for (const u of users) {
    await supabase.from("users").upsert(u, { onConflict: "id" });
  }
};
```

---

## Шаг 7: Порядок миграции эндпоинтов

| Эндпоинт | Таблица | Действие |
|----------|---------|----------|
| GET/POST/PUT/DELETE /vacancies | vacancies | Заменить load/save на Supabase |
| GET/POST/PUT/DELETE /candidates | candidates | То же |
| GET/POST/DELETE /matches | matches | То же |
| GET/POST/DELETE /calendar | calendar_events | То же |
| GET/POST/PUT/DELETE /communications | communications | То же |
| GET/POST /support/* | support_messages | То же |
| /auth/login, /auth/register | users | То же |

---

## Шаг 8: Подключение в Supabase Dashboard (опционально)

1. **Settings → API** — скопируйте URL и ключи  
2. **Table Editor** — проверьте созданные таблицы  
3. **Database → Roles** — при необходимости настройте доступ  

---

## Шаг 9: Тестирование

1. Запустите бэкенд: `cd backend && npm run dev`  
2. Убедитесь, что `.env` загружается (проверьте `dotenv`)  
3. Выполните логин и проверьте, что вакансии/кандидаты загружаются из Supabase  

---

## Шаг 10: Миграция существующих данных (если нужно)

Скрипт для переноса данных из JSON в Supabase:

```typescript
// scripts/migrate-to-supabase.ts
import { supabase } from "../src/supabase.js";
import users from "../data/users.json" assert { type: "json" };

for (const u of users) {
  await supabase.from("users").upsert(u);
}
// Аналогично для vacancies, candidates и т.д. из user-usr-XXX-*.json
```

---

## Краткий чеклист

- [ ] Создать таблицы в Supabase (SQL Editor)  
- [ ] Установить `@supabase/supabase-js`  
- [ ] Добавить `SUPABASE_URL` и `SUPABASE_SERVICE_KEY` в `.env`  
- [ ] Создать `backend/src/supabase.ts`  
- [ ] Заменить `loadUsers`/`saveUsers` на Supabase  
- [ ] Заменить `loadUserData`/`saveUserData` для каждой сущности  
- [ ] Протестировать все эндпоинты  
- [ ] (Опционально) Мигрировать данные из JSON  

---

## DOM Path из вашего сообщения

Вы указали элемент: `div#root > div.hell > div.app > section.grid > div.card[1]` — это карточка «Подходящие кандидаты» в разделе ИИ матчинга. Она не связана напрямую с Supabase — данные туда приходят через API бэкенда. После миграции бэкенда на Supabase эта карточка будет автоматически получать данные из новой БД.

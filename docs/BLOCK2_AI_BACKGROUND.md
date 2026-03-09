# Блок 2: Постоянная работа AI-матчинга

Для полной реализации требуется:

1. **Redis** — для очереди BullMQ (Upstash на Render или Redis addon)
2. **Worker** — отдельный процесс или отдельный сервис на Render
3. **Переменные:** `REDIS_URL`, `FEATURE_AI_BACKGROUND=true`

## Минимальная реализация

### 1. Установка

```bash
cd backend
npm install bullmq ioredis
```

### 2. Создать `backend/src/queue.ts`

```ts
import { Queue } from "bullmq";
const redisUrl = process.env.REDIS_URL;
export const matchQueue = redisUrl
  ? new Queue("ai-match", { connection: { url: redisUrl } })
  : null;
```

### 3. После добавления вакансии/кандидата

В `POST /vacancies` и `POST /candidates` добавить:
```ts
if (FEATURE_AI_BACKGROUND && matchQueue) {
  await matchQueue.add("match-vacancy", { vacancy_id, user_id });
}
```

### 4. Worker (`backend/src/worker.ts`)

Отдельный скрипт, запускается как `node dist/worker.js`:
- Слушает очередь
- Вызывает AI-сервис
- Сохраняет топ-N в matches
- Создаёт notifications при score > 85%

### 5. Cron

Использовать Render Cron Job или внешний сервис (cron-job.org) для периодического `POST /internal/recalculate-all` (защищённый endpoint).

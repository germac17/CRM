# Найми

Платформа для умного найма, управления жизненным циклом сотрудников и развития талантов с графом навыков и предиктивным матчингом.

## Структура

| Папка      | Назначение                    |
|-----------|--------------------------------|
| `backend/` | API (Node.js, TypeScript), раздаёт фронт в production |
| `frontend/`| Интерфейс (React, TypeScript)  |
| `ai/`      | ИИ-матчинг (Python), опционально |
| `docs/`    | Требования, архитектура        |

## Локальный запуск

**Один скрипт (рекомендуется):**
```powershell
.\start_all.ps1
```
Запускает backend (4000) и frontend (3000). Откройте http://localhost:3000. Логин: **admin@crm.ru** / **admin**.

**Вручную:**
```powershell
# Терминал 1
cd backend; npm install; npm run dev

# Терминал 2
cd frontend; npm install; npm run dev
```

ИИ-матчинг (по желанию): `cd ai`, установите зависимости, запустите `python app.py` (порт 8001), в `backend/.env` укажите `AI_SERVICE_URL=http://localhost:8001`.

## Развёртывание на одном хосте

Сборка фронта, настройка backend и запуск на одном сервере описаны в **[DEPLOY.md](DEPLOY.md)**.

## Документация

- `docs/PRD.md`, `docs/architecture.md`, `docs/roadmap.md` — продукт и архитектура
- `docs/AI_MATCHING_SYSTEM.md` — описание ИИ-матчинга

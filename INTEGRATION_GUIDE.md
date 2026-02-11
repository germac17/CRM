# 🔌 Руководство по интеграции ИИ-матчинга

## ✅ Что интегрировано

Система ИИ-матчинга полностью интегрирована в ваш HR CRM:

### Frontend (React)
- ✅ Новая вкладка "ИИ матчинг" с расширенным функционалом
- ✅ Автоматический анализ кандидатов по кнопке
- ✅ Категоризация результатов (🟢 🟡 🔴)
- ✅ Детальная разбивка оценок
- ✅ Красивый UI с градиентами и анимациями

### Backend (Node.js)
- ✅ Прокси-эндпоинты для AI-сервиса
- ✅ Автоматическое сохранение результатов
- ✅ Интеграция с авторизацией

### AI Service (Python)
- ✅ REST API с 7 endpoints
- ✅ NLP обработка (spaCy + BERT)
- ✅ Алгоритм матчинга (оценка 1-10)
- ✅ Парсинг резюме

---

## 🚀 Запуск интегрированной системы

### Вариант 1: Запуск всех сервисов (рекомендуется)

**Терминал 1 - Backend:**
```powershell
cd backend
npm install
npm run dev
```
Запустится на: http://localhost:4000

**Терминал 2 - AI Service:**
```powershell
cd ai
python app.py
```
Запустится на: http://localhost:8001

**Терминал 3 - Frontend:**
```powershell
cd frontend
npm install
npm run dev
```
Запустится на: http://localhost:3000

### Вариант 2: Docker Compose (один клик)

```powershell
docker-compose up -d
```

Проверка статуса:
```powershell
docker-compose ps
```

Логи:
```powershell
docker-compose logs -f
```

---

## 🎯 Как использовать

### Шаг 1: Войдите в систему

1. Откройте http://localhost:3000
2. Войдите:
   - Email: `admin@crm.ru`
   - Password: `admin`

### Шаг 2: Создайте тестовые данные

**Опция A: Через скрипт**
```powershell
cd ai
python create_test_data.py
```

**Опция B: Через UI**

1. Перейдите в "Вакансии"
2. Создайте вакансию:
   ```
   Название: Senior Python Developer
   Отдел: Backend
   Локация: Москва / Remote
   ```

3. Перейдите в "Кандидаты"
4. Добавьте кандидатов с навыками:
   ```
   Имя: Иван Петров
   Роль: Python Developer
   Навыки: (будут извлечены автоматически)
   ```

### Шаг 3: Запустите ИИ-матчинг

1. Перейдите на вкладку **"ИИ матчинг"** 🤖
2. Выберите вакансию из списка
3. Нажмите **"🚀 Запустить AI-анализ"**
4. Подождите 5-30 секунд (в зависимости от количества кандидатов)

### Шаг 4: Посмотрите результаты

Кандидаты автоматически распределятся по категориям:

- **🟢 Подходящие (7-10 баллов)** - Приглашаем на собеседование
  - Детальная разбивка оценки
  - Совпадение навыков
  - Семантическое сходство
  - Соответствие опыта

- **🟡 Условно подходящие (4-6 баллов)** - Рассматриваем
  - Частичное совпадение требований
  - Может подойти при доработке

- **🔴 Не подходящие (1-3 балла)** - Отклоняем
  - Минимальное соответствие

---

## 🔧 Архитектура интеграции

```
┌─────────────────────────────────────────────────────────────┐
│                Frontend (React) :3000                       │
│                                                              │
│  Вкладка "ИИ матчинг":                                      │
│  • Выбор вакансии                                           │
│  • Кнопка "Запустить AI-анализ"                            │
│  • Отображение результатов по категориям                   │
│  • Детальная информация о каждом кандидате                 │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP Request
                         │ POST /ai/match/batch
┌────────────────────────┴────────────────────────────────────┐
│             Backend (Node.js/Express) :4000                 │
│                                                              │
│  Эндпоинты:                                                 │
│  • POST /ai/match/batch - Массовый анализ                  │
│  • POST /ai/match/analyze - Анализ одного                  │
│  • Авторизация                                              │
│  • Сохранение результатов                                   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP Request
                         │ POST /api/match/batch
┌────────────────────────┴────────────────────────────────────┐
│              AI Service (Python/FastAPI) :8001              │
│                                                              │
│  • NLP обработка (spaCy)                                    │
│  • Векторизация (TF-IDF + BERT)                            │
│  • Расчет оценок (1-10)                                     │
│  • Категоризация                                            │
│  • Генерация объяснений                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Поток данных

### 1. Пользователь нажимает "Запустить AI-анализ"

Frontend отправляет:
```javascript
POST http://localhost:4000/ai/match/batch
{
  "vacancy_id": "vac-001",
  "auto_save": true
}
```

### 2. Backend проксирует к AI-сервису

Backend отправляет:
```javascript
POST http://localhost:8001/api/match/batch
{
  "vacancy_id": "vac-001",
  "auto_save": false
}
```

### 3. AI-сервис обрабатывает

- Загружает вакансию и кандидатов из `backend/data/`
- Анализирует каждого кандидата
- Рассчитывает оценки 1-10
- Категоризирует результаты

### 4. AI-сервис возвращает результаты

```json
{
  "matches": [
    {
      "candidate_id": "cand-001",
      "vacancy_id": "vac-001",
      "score": 8.5,
      "category": "Подходящие",
      "explanation": "Оценка: 8.5/10 - Подходящие. Навыки: 5/3 (167%)...",
      "details": {
        "skills_match": {"matched": 5, "required": 3, "score": 4.0},
        "semantic_similarity": 0.87,
        "experience_match": 1.0,
        "education_match": true
      },
      "confidence": 0.92,
      "needs_review": false
    }
  ],
  "summary": {
    "total": 10,
    "suitable": 3,
    "conditional": 5,
    "unsuitable": 2
  }
}
```

### 5. Backend сохраняет результаты

- Фильтрует кандидатов с оценкой >= 4.0
- Сохраняет в `matches.json`
- Возвращает результаты frontend

### 6. Frontend отображает

- Разделяет по категориям
- Показывает детали оценки
- Подсвечивает лучших кандидатов

---

## 🔌 API Endpoints

### Backend Proxy

#### POST /ai/match/batch
Массовый анализ кандидатов для вакансии

**Request:**
```json
{
  "vacancy_id": "vac-001",
  "auto_save": true
}
```

**Response:**
```json
{
  "matches": [...],
  "summary": {
    "total": 10,
    "suitable": 3,
    "conditional": 5,
    "unsuitable": 2
  }
}
```

#### POST /ai/match/analyze
Анализ одного кандидата

**Request:**
```json
{
  "vacancy_id": "vac-001",
  "candidate_id": "cand-123"
}
```

**Response:**
```json
{
  "candidate_id": "cand-123",
  "score": 8.5,
  "category": "Подходящие",
  "explanation": "..."
}
```

### AI Service Direct

Все эндпоинты из `ai/README.md`:
- GET `/health`
- POST `/api/match/analyze`
- POST `/api/match/batch`
- GET `/api/match/top/{vacancy_id}`
- POST `/api/parse/resume`
- POST `/api/parse/file`
- GET `/api/stats`

---

## 🎨 Особенности UI

### Карточки кандидатов

**Подходящие (зеленые):**
- Градиентный фон (белый → светло-зеленый)
- Зеленая рамка
- Крупный бейдж с оценкой
- Расширенная информация
- Кнопка "Показать детали"

**Условно подходящие (желтые):**
- Градиентный фон (белый → светло-желтый)
- Желтая рамка
- Компактная информация

**Не подходящие (красные):**
- Градиентный фон (белый → светло-красный)
- Красная рамка
- Пониженная прозрачность
- Показываются только первые 5

### Сводная панель

Показывает статистику:
- Всего проанализировано
- Подходящие (🟢)
- Условно подходящие (🟡)
- Не подходящие (🔴)

### Детальная информация

При нажатии "Показать детали":
- Совпавшие навыки
- Отсутствующие навыки
- Уверенность модели
- Бонусы за nice-to-have

---

## 📝 Переменные окружения

### Frontend (.env)
```env
VITE_API_URL=http://localhost:4000
VITE_AI_URL=http://localhost:8001
```

### Backend (.env)
```env
PORT=4000
AI_SERVICE_URL=http://localhost:8001
```

### AI Service (.env)
```env
API_HOST=0.0.0.0
API_PORT=8001
LOG_LEVEL=INFO
```

---

## 🧪 Тестирование интеграции

### 1. Проверка всех сервисов

```powershell
# Backend
curl http://localhost:4000/health

# AI Service
curl http://localhost:8001/health

# Frontend
# Откройте http://localhost:3000
```

### 2. Создание тестовых данных

```powershell
cd ai
python create_test_data.py
```

Создаст:
- 3 вакансии
- 5 кандидатов
- С детальными резюме и навыками

### 3. Тест через UI

1. Перейдите на вкладку "ИИ матчинг"
2. Выберите "Senior Python Developer"
3. Нажмите "Запустить AI-анализ"
4. Через 5-10 секунд увидите результаты

### 4. Тест через API

```powershell
# Через backend (с авторизацией)
curl -X POST "http://localhost:4000/ai/match/batch" `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{"vacancy_id": "vac-test-001", "auto_save": true}'

# Напрямую к AI-сервису
curl -X POST "http://localhost:8001/api/match/batch" `
  -H "Content-Type: application/json" `
  -d '{"vacancy_id": "vac-test-001"}'
```

---

## 🎬 Демонстрация работы

### Сценарий 1: Автоматический подбор для новой вакансии

1. **Создайте вакансию:**
   - Вкладка "Вакансии"
   - "Создать вакансию"
   - Заполните: Senior Python Developer, Backend, Москва

2. **Добавьте кандидатов:**
   - Вкладка "Кандидаты"
   - Добавьте 3-5 кандидатов с разными навыками

3. **Запустите матчинг:**
   - Вкладка "ИИ матчинг"
   - Выберите созданную вакансию
   - Нажмите "Запустить AI-анализ"

4. **Просмотрите результаты:**
   - Кандидаты автоматически распределены по категориям
   - Каждый имеет оценку и объяснение
   - Лучшие кандидаты выделены зеленым

### Сценарий 2: Анализ существующих кандидатов

Если у вас уже есть кандидаты в системе:

1. Перейдите в "ИИ матчинг"
2. Выберите любую вакансию
3. Запустите анализ
4. Система автоматически найдет лучших кандидатов

---

## 🎨 Кастомизация UI

### Изменение цветов категорий

Отредактируйте `frontend/src/styles.css`:

```css
/* Подходящие - зеленый */
.ai-match-item.suitable {
  border-color: #10b981;  /* Измените цвет */
  background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
}

/* Условно подходящие - желтый */
.ai-match-item.conditional {
  border-color: #f59e0b;  /* Измените цвет */
  background: linear-gradient(135deg, #ffffff 0%, #fffbeb 100%);
}

/* Не подходящие - красный */
.ai-match-item.unsuitable {
  border-color: #ef4444;  /* Измените цвет */
  background: linear-gradient(135deg, #ffffff 0%, #fef2f2 100%);
}
```

### Изменение порогов категорий

Отредактируйте `ai/config.py`:

```python
CATEGORY_THRESHOLDS = {
    "suitable": 8.0,      # Было 7.0 - более строго
    "conditional": 5.0,   # Было 4.0
}
```

После изменения перезапустите AI-сервис:
```powershell
cd ai
python app.py
```

---

## 🐛 Решение проблем

### Ошибка: "AI сервис недоступен"

**Решение:**
1. Проверьте, что AI-сервис запущен:
   ```powershell
   cd ai
   python app.py
   ```

2. Проверьте порт в браузере: http://localhost:8001/health

3. Проверьте переменные окружения в `frontend/.env`:
   ```env
   VITE_AI_URL=http://localhost:8001
   ```

### Ошибка: "Вакансия не найдена"

**Причина:** AI-сервис читает данные из `backend/data/`

**Решение:**
1. Убедитесь, что backend запущен
2. Создайте вакансию через UI
3. Проверьте файл: `backend/data/user-usr-admin-vacancies.json`

### Результаты не сохраняются

**Решение:**
1. Проверьте параметр `auto_save: true` в запросе
2. Проверьте права на запись в `backend/data/`
3. Обновите страницу после анализа

### Медленная работа

**Причины и решения:**

1. **Первый запуск** - загружаются ML модели (~500MB)
   - Подождите 2-3 минуты
   - Последующие запуски будут быстрее

2. **Много кандидатов** - обработка занимает время
   - 10 кандидатов: ~10 сек
   - 50 кандидатов: ~30 сек
   - 100 кандидатов: ~60 сек

3. **Медленный CPU** - используйте только TF-IDF
   - В `ai/config.py` отключите BERT
   - Или используйте сервер с GPU

---

## 📈 Оптимизация производительности

### 1. Кэширование результатов

Добавьте Redis для кэширования векторов:

```python
# ai/services/vectorizer.py
import redis

cache = redis.Redis(host='localhost', port=6379)

def get_cached_embedding(text):
    key = f"emb:{hash(text)}"
    cached = cache.get(key)
    if cached:
        return pickle.loads(cached)
    
    embedding = model.encode(text)
    cache.setex(key, 3600, pickle.dumps(embedding))
    return embedding
```

### 2. Асинхронная обработка

Для больших объемов используйте Celery:

```python
from celery import Celery

@celery.task
def match_async(vacancy_id):
    # Обработка в фоне
    results = process_matching(vacancy_id)
    send_notification(results)
```

### 3. Батч-обработка

Обрабатывайте кандидатов пачками по 50-100:

```python
for batch in chunks(candidates, size=100):
    process_batch(vacancy, batch)
```

---

## 🔐 Безопасность

### 1. Авторизация к AI-сервису

Добавьте API ключи:

```python
# ai/app.py
from fastapi import Security, HTTPException
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def verify_api_key(credentials = Security(security)):
    if credentials.credentials != os.getenv("AI_API_KEY"):
        raise HTTPException(status_code=401, detail="Неверный API ключ")

@app.post("/api/match/batch", dependencies=[Security(verify_api_key)])
async def batch_match(...):
    # ...
```

### 2. Rate Limiting

Ограничьте количество запросов:

```python
from slowapi import Limiter

limiter = Limiter(key_func=lambda: "global")

@app.post("/api/match/batch")
@limiter.limit("10/minute")
async def batch_match(...):
    # ...
```

### 3. CORS

В production ограничьте домены:

```python
# ai/app.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-domain.com"],  # Конкретный домен
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)
```

---

## 📊 Мониторинг

### Логи AI-сервиса

```powershell
# Запуск с расширенными логами
cd ai
$env:LOG_LEVEL="DEBUG"
python app.py
```

### Метрики

Посмотрите статистику:
```powershell
curl http://localhost:8001/api/stats
```

Вывод:
```json
{
  "candidates_count": 10,
  "vacancies_count": 3,
  "matches_count": 15,
  "service_status": "operational"
}
```

---

## 🚀 Production Deployment

### Docker Compose (рекомендуется)

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      - AI_SERVICE_URL=http://ai-service:8001
    depends_on:
      - ai-service

  ai-service:
    build: ./ai
    ports:
      - "8001:8001"
    volumes:
      - ./backend/data:/app/../backend/data:ro

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:4000
      - VITE_AI_URL=http://localhost:8001
    depends_on:
      - backend
```

Запуск:
```powershell
docker-compose up -d
```

---

## ✅ Checklist интеграции

- [x] AI-сервис установлен и работает
- [x] Backend endpoints добавлены
- [x] Frontend вкладка обновлена
- [x] Стили для UI добавлены
- [x] Тестовые данные созданы
- [x] Документация написана

### Что проверить:

- [ ] Backend запущен на :4000
- [ ] AI-сервис запущен на :8001
- [ ] Frontend запущен на :3000
- [ ] Есть хотя бы 1 вакансия
- [ ] Есть хотя бы 1 кандидат
- [ ] Переменные окружения настроены

---

## 🎉 Готово!

Система ИИ-матчинга полностью интегрирована в ваш HR CRM!

**Следующие шаги:**
1. Запустите все сервисы
2. Откройте http://localhost:3000
3. Перейдите на вкладку "ИИ матчинг"
4. Запустите анализ
5. Наслаждайтесь автоматическим подбором кандидатов! 🚀

**Поддержка:**
- `START_HERE.md` - быстрый старт
- `ai/FAQ.md` - вопросы и ответы
- http://localhost:8001/docs - API документация

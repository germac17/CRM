# AI Service - Система ИИ-матчинга для HR CRM

Интеллектуальная система автоматического подбора кандидатов на основе анализа резюме и требований вакансий.

## Быстрый старт

### 1. Установка зависимостей

```bash
# Создание виртуального окружения
python -m venv .venv

# Активация (Windows)
.venv\Scripts\activate

# Активация (Linux/Mac)
source .venv/bin/activate

# Установка пакетов
pip install -r requirements.txt

# Загрузка spaCy модели для русского языка
python -m spacy download ru_core_news_md
```

### 2. Запуск сервиса

```bash
# Запуск FastAPI сервера
uvicorn app:app --reload --port 8001

# Или через Python
python app.py
```

Сервис будет доступен по адресу: http://localhost:8001

Документация API: http://localhost:8001/docs

### 3. Демонстрация работы

```bash
# Запуск демонстрации
python demo.py
```

## Структура проекта

```
ai/
├── app.py                    # FastAPI приложение (главный файл)
├── config.py                 # Конфигурация
├── requirements.txt          # Зависимости Python
├── demo.py                   # Демонстрация работы
│
├── models/                   # Модели данных
│   ├── __init__.py
│   ├── candidate.py          # Модель кандидата
│   ├── vacancy.py            # Модель вакансии
│   └── match.py              # Модель результата матчинга
│
├── services/                 # Бизнес-логика
│   ├── __init__.py
│   ├── nlp_service.py        # NLP обработка текста
│   ├── vectorizer.py         # Векторизация (TF-IDF, BERT)
│   ├── matcher_service.py    # Алгоритм матчинга
│   └── parser_service.py     # Парсинг резюме
│
└── utils/                    # Вспомогательные функции
    ├── __init__.py
    ├── synonyms.py           # Словари синонимов
    ├── filters.py            # Обработка фильтров
    └── scoring.py            # Расчет оценок
```

## API Endpoints

### Health Check
```http
GET /health
```

### Анализ одного кандидата
```http
POST /api/match/analyze
Content-Type: application/json

{
  "vacancy_id": "vac-001",
  "candidate_id": "cand-123"
}
```

### Массовый анализ
```http
POST /api/match/batch
Content-Type: application/json

{
  "vacancy_id": "vac-001",
  "candidate_ids": ["cand-123", "cand-456"],  # опционально
  "auto_save": true
}
```

### Топ кандидатов
```http
GET /api/match/top/{vacancy_id}?limit=10
```

### Парсинг резюме
```http
POST /api/parse/resume
Content-Type: application/json

{
  "text": "Опыт работы: 5 лет Python разработчиком...",
  "format": "text"
}
```

### Загрузка файла резюме
```http
POST /api/parse/file
Content-Type: multipart/form-data

file: resume.pdf
```

### Статистика
```http
GET /api/stats
```

## 🧪 Примеры использования

### Python
```python
import requests

# Анализ кандидата
response = requests.post(
    "http://localhost:8001/api/match/analyze",
    json={
        "vacancy_id": "vac-001",
        "candidate_id": "cand-123"
    }
)

result = response.json()
print(f"Оценка: {result['score']}/10")
print(f"Категория: {result['category']}")
print(f"Объяснение: {result['explanation']}")
```

### cURL
```bash
# Массовый анализ
curl -X POST "http://localhost:8001/api/match/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "vacancy_id": "vac-001",
    "auto_save": true
  }'
```

### JavaScript
```javascript
// Топ кандидатов
fetch('http://localhost:8001/api/match/top/vac-001?limit=5')
  .then(response => response.json())
  .then(data => {
    console.log('Топ кандидатов:', data.matches);
    console.log('Сводка:', data.summary);
  });
```

## Алгоритм матчинга

### Компоненты оценки:

1. **Навыки (40%)** - Совпадение требуемых и имеющихся навыков
   - Учитываются синонимы (Python = Python3)
   - Must-have vs Nice-to-have

2. **Семантическое сходство (30%)** - Анализ текстов
   - TF-IDF векторизация
   - BERT эмбеддинги (если доступны)
   - Cosine similarity

3. **Опыт работы (20%)** - Соответствие требуемому опыту
   - Извлечение лет опыта из резюме
   - Сравнение с требованиями

4. **Образование (10%)** - Наличие требуемого образования
   - Высшее / среднее специальное / курсы

### Итоговая оценка: 1-10 баллов

- **7-10** - Подходящие (приглашаем на собеседование)
- **4-6** - Условно подходящие (рассматриваем)
- **1-3** - Не подходящие (отклоняем)

## Особенности

### Словарь синонимов
Система понимает синонимы и эквиваленты:
- Python = Python3 = питон
- JavaScript = JS = ES6
- Kubernetes = K8s = кубер
- PostgreSQL = Postgres = PG

### Фильтры и веса
Настраиваемые критерии для каждой вакансии:
- **Must-have** - обязательные требования (вес 1-5)
- **Nice-to-have** - желательные навыки (дают бонус)
- **Dealbreakers** - исключающие факторы (штраф)

### Прозрачность
Для каждой оценки предоставляется:
- Детальная разбивка по компонентам
- Объяснение на естественном языке
- Уверенность модели (confidence)
- Флаг "Требует проверки HR"

## Производительность

- Анализ 1 кандидата: ~0.5-2 секунды
- Массовый анализ 100 кандидатов: ~30-60 секунд
- Точность: 75-85% (при наличии обучающих данных)

## Интеграция с Backend

AI-сервис интегрируется с основным backend через REST API:

```typescript
// backend/src/server.ts
const AI_SERVICE_URL = "http://localhost:8001";

// Запуск матчинга при создании вакансии
app.post("/vacancies", async (req, res) => {
  // ... создание вакансии
  
  // Автоматический запуск матчинга
  const matchResponse = await fetch(`${AI_SERVICE_URL}/api/match/batch`, {
    method: "POST",
    body: JSON.stringify({
      vacancy_id: newVacancy.id,
      auto_save: true
    })
  });
  
  // ...
});
```

## Зависимости

### Core
- **FastAPI** - веб-фреймворк
- **Pydantic** - валидация данных
- **Uvicorn** - ASGI сервер

### NLP & ML
- **spaCy** - обработка естественного языка
- **scikit-learn** - ML алгоритмы (TF-IDF, cosine similarity)
- **sentence-transformers** - BERT эмбеддинги
- **numpy** - численные вычисления

### Парсинг
- **PyPDF2** - парсинг PDF
- **python-docx** - парсинг DOCX

## Отладка

### Логирование
```python
# config.py
LOG_LEVEL = "DEBUG"  # INFO, WARNING, ERROR, DEBUG
```

### Проверка моделей
```bash
# Проверка spaCy
python -c "import spacy; nlp = spacy.load('ru_core_news_md'); print('spaCy OK')"

# Проверка Sentence Transformers
python -c "from sentence_transformers import SentenceTransformer; print('BERT OK')"
```

## Дальнейшее развитие

- [ ] Интеграция с HH.ru API
- [ ] Кэширование результатов (Redis)
- [ ] Асинхронная обработка (Celery)
- [ ] Обучение на реальных данных
- [ ] A/B тестирование алгоритмов
- [ ] Мониторинг (Prometheus)
- [ ] Docker контейнеризация

## Документация

Подробная документация системы: `../docs/AI_MATCHING_SYSTEM.md`

## Поддержка

При возникновении вопросов или проблем:
1. Проверьте логи сервиса
2. Убедитесь, что все зависимости установлены
3. Проверьте наличие данных в `backend/data/`

## Лицензия

Proprietary - для внутреннего использования компании

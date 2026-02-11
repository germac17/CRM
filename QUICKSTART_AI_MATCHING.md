# 🚀 Быстрый старт: Система ИИ-матчинга

## За 5 минут от установки до работающей системы

### ✅ Предварительные требования

- Python 3.9+ ([скачать](https://www.python.org/downloads/))
- Node.js 18+ (для backend и frontend)
- Git

### 📦 Шаг 1: Установка AI-сервиса

```bash
# Перейдите в папку ai
cd ai

# Запустите автоматическую установку
python setup.py
```

Скрипт автоматически:
- Создаст виртуальное окружение
- Установит все зависимости
- Загрузит NLP модели
- Проверит установку

**Альтернатива (вручную):**
```bash
# Создание виртуального окружения
python -m venv .venv

# Активация
.venv\Scripts\activate          # Windows
source .venv/bin/activate       # Linux/Mac

# Установка зависимостей
pip install -r requirements.txt

# Загрузка spaCy модели
python -m spacy download ru_core_news_md
```

### 🎯 Шаг 2: Запуск демонстрации

```bash
# Убедитесь, что виртуальное окружение активировано
python demo.py
```

Вы увидите:
- ✅ Анализ 5 демо-кандидатов
- 📊 Оценки по 10-бальной шкале
- 🎨 Категоризацию (Подходящие/Условно/Не подходящие)
- 💬 Объяснения оценок
- 📈 Сводную статистику

### 🌐 Шаг 3: Запуск API-сервиса

```bash
# Запуск FastAPI сервера
uvicorn app:app --reload --port 8001
```

**Или через Python:**
```bash
python app.py
```

Сервис доступен:
- 🏥 Health: http://localhost:8001/health
- 📚 Документация: http://localhost:8001/docs
- 🔗 API: http://localhost:8001/api/

### ✅ Шаг 4: Тестирование API

```bash
# В новом терминале (пока сервис работает)
python test_api.py
```

Скрипт проверит:
- ✓ Работу сервиса
- ✓ Парсинг резюме
- ✓ Наличие данных
- ✓ Документацию

### 🔌 Шаг 5: Интеграция с существующей CRM

#### Вариант A: Запуск полной системы (рекомендуется)

```bash
# В корне проекта
cd ..

# Backend (терминал 1)
cd backend
npm install
npm run dev              # http://localhost:4000

# Frontend (терминал 2)
cd frontend
npm install
npm run dev              # http://localhost:3000

# AI Service (терминал 3)
cd ai
.venv\Scripts\activate   # Windows
source .venv/bin/activate # Linux/Mac
python app.py            # http://localhost:8001
```

#### Вариант B: Docker Compose (один клик)

```bash
# В корне проекта
docker-compose up -d

# Проверка статуса
docker-compose ps

# Логи
docker-compose logs -f ai-service
```

Доступ:
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- AI Service: http://localhost:8001

### 🧪 Шаг 6: Проверка работы

1. **Откройте frontend**: http://localhost:3000

2. **Войдите в систему**:
   - Email: `admin@crm.ru`
   - Password: `admin`

3. **Создайте тестовую вакансию**:
   - Перейдите в "Вакансии"
   - Нажмите "Добавить вакансию"
   - Заполните форму:
     ```
     Название: Senior Python Developer
     Отдел: Backend
     Локация: Москва
     ```

4. **Добавьте кандидата**:
   - Перейдите в "Кандидаты"
   - Нажмите "Добавить кандидата"
   - Заполните:
     ```
     Имя: Иван Петров
     Роль: Python Developer
     Навыки: Python, Django, PostgreSQL, Docker
     ```

5. **Запустите матчинг**:
   - Перейдите в "Матчинг"
   - Выберите вакансию
   - Нажмите "Анализировать кандидатов"

6. **Посмотрите результаты**:
   - Оценки 1-10 для каждого кандидата
   - Категории (🟢 🟡 🔴)
   - Объяснения оценок
   - Сортировку по релевантности

### 📊 Использование API напрямую

#### Curl
```bash
# Парсинг резюме
curl -X POST "http://localhost:8001/api/parse/resume" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "5 лет опыта Python. Навыки: Django, PostgreSQL, Docker",
    "format": "text"
  }'

# Анализ кандидата
curl -X POST "http://localhost:8001/api/match/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "vacancy_id": "vac-001",
    "candidate_id": "cand-123"
  }'

# Массовый анализ
curl -X POST "http://localhost:8001/api/match/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "vacancy_id": "vac-001",
    "auto_save": true
  }'
```

#### Python
```python
import requests

# Парсинг резюме
response = requests.post(
    "http://localhost:8001/api/parse/resume",
    json={
        "text": "5 лет опыта Python разработчиком...",
        "format": "text"
    }
)
print(response.json())

# Матчинг
response = requests.post(
    "http://localhost:8001/api/match/analyze",
    json={
        "vacancy_id": "vac-001",
        "candidate_id": "cand-123"
    }
)
match = response.json()
print(f"Оценка: {match['score']}/10")
print(f"Категория: {match['category']}")
```

#### JavaScript
```javascript
// Парсинг резюме
const resume = await fetch('http://localhost:8001/api/parse/resume', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: '5 лет опыта Python...',
    format: 'text'
  })
}).then(r => r.json());

console.log('Навыки:', resume.skills);

// Топ кандидатов
const top = await fetch('http://localhost:8001/api/match/top/vac-001?limit=5')
  .then(r => r.json());

console.log('Топ-5:', top.matches);
```

### 🎨 Примеры результатов

#### Идеальное совпадение (9.2/10)
```json
{
  "score": 9.2,
  "category": "Подходящие",
  "explanation": "Оценка: 9.2/10 - Подходящие. Навыки: 5/3 (167%). ✓ Все требуемые навыки присутствуют. ✓ Опыт: 5.0 лет (требуется 3). ✓ Образование соответствует",
  "confidence": 0.92,
  "needs_review": false,
  "details": {
    "skills_match": {"matched": 5, "required": 3, "score": 4.0},
    "semantic_similarity": 0.87,
    "experience_match": 1.0,
    "education_match": true
  }
}
```

#### Частичное совпадение (5.4/10)
```json
{
  "score": 5.4,
  "category": "Условно подходящие",
  "explanation": "Оценка: 5.4/10 - Условно подходящие. Навыки: 2/3 (67%). Отсутствуют: Django. Опыт: 2.5 лет (требуется 3) - недостаточно",
  "confidence": 0.78,
  "needs_review": true
}
```

#### Несоответствие (2.3/10)
```json
{
  "score": 2.3,
  "category": "Не подходящие",
  "explanation": "Оценка: 2.3/10 - Не подходящие. Навыки: 0/3 (0%). ✗ Требуемые навыки не найдены. Опыт: 4.0 лет (требуется 3)",
  "confidence": 0.65,
  "needs_review": false
}
```

### 🔧 Настройка под свои нужды

#### 1. Изменение весов компонентов
```python
# ai/config.py
WEIGHTS = {
    "skills": 0.50,      # Увеличиваем важность навыков до 50%
    "semantic": 0.20,    # Снижаем семантику до 20%
    "experience": 0.20,
    "education": 0.10,
}
```

#### 2. Изменение порогов категорий
```python
# ai/config.py
CATEGORY_THRESHOLDS = {
    "suitable": 8.0,      # Более строгий отбор
    "conditional": 5.0,
}
```

#### 3. Добавление синонимов
```python
# ai/utils/synonyms.py
SKILL_SYNONYMS = {
    # ... существующие
    "ваш_навык": ["синоним1", "синоним2"],
}
```

### 📚 Дополнительные ресурсы

- **Полная документация**: `docs/AI_MATCHING_SYSTEM.md`
- **README AI-сервиса**: `ai/README.md`
- **API документация**: http://localhost:8001/docs
- **Примеры кода**: `ai/demo.py`

### 🐛 Решение проблем

#### Проблема: "ModuleNotFoundError: No module named 'spacy'"
```bash
# Убедитесь, что виртуальное окружение активировано
.venv\Scripts\activate  # Windows
source .venv/bin/activate # Linux/Mac

# Переустановите зависимости
pip install -r requirements.txt
```

#### Проблема: "Can't find model 'ru_core_news_md'"
```bash
# Загрузите модель вручную
python -m spacy download ru_core_news_md
```

#### Проблема: "Connection refused" при тестировании API
```bash
# Убедитесь, что сервис запущен
python app.py

# В другом терминале
python test_api.py
```

#### Проблема: "No such file or directory: backend/data/"
```bash
# Создайте директорию
mkdir -p backend/data

# Или запустите backend сервер сначала
cd backend
npm run dev
```

### 🎉 Готово!

Теперь у вас работает:
- ✅ AI-сервис для матчинга
- ✅ Парсинг резюме
- ✅ Автоматическая оценка кандидатов
- ✅ REST API для интеграций
- ✅ Интеграция с HR CRM

**Следующие шаги:**
1. Добавьте реальные вакансии и кандидатов
2. Настройте фильтры под свои нужды
3. Интегрируйте с HH.ru API (опционально)
4. Настройте email-уведомления
5. Разверните на production сервере

**Нужна помощь?** 
- Проверьте `docs/AI_MATCHING_SYSTEM.md`
- Запустите `python demo.py` для примеров
- Откройте http://localhost:8001/docs для интерактивной документации API

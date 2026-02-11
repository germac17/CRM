# Система ИИ-матчинга для HR CRM

## 1. ВВЕДЕНИЕ

### 1.1 Описание системы
Интеллектуальная система автоматического подбора кандидатов на основе анализа резюме и требований вакансий. Система использует NLP для парсинга текстов, машинное обучение для расчета совместимости и автоматически классифицирует кандидатов по категориям.

### 1.2 Ключевые возможности
- **Автоматический парсинг резюме**: извлечение навыков, опыта, образования
- **Семантический анализ**: понимание контекста и синонимов (Python = Python3)
- **Оценка по 10-бальной шкале**: точный расчет совместимости
- **Автоматическая категоризация**:
  - 🟢 Подходящие (7-10 баллов)
  - 🟡 Условно подходящие (4-6 баллов)
  - 🔴 Не подходящие (1-3 балла)
- **Объяснение оценок**: прозрачная логика принятия решений

---

## 2. АРХИТЕКТУРА СИСТЕМЫ

### 2.1 Компоненты

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Вакансии    │  │  Кандидаты   │  │  Матчинг     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST
┌────────────────────────┴────────────────────────────────────┐
│                  Backend API (Node.js/Express)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Vacancies   │  │  Candidates  │  │   Matches    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST
┌────────────────────────┴────────────────────────────────────┐
│              AI Service (Python/FastAPI)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  NLP Engine  │  │  ML Matcher  │  │  Vectorizer  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                    Data Storage                             │
│              JSON files (для MVP)                           │
│        PostgreSQL/MongoDB (для production)                  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Потоки данных

#### 2.2.1 Создание вакансии
```
HR → Frontend → Backend → Сохранение в БД
```

#### 2.2.2 Добавление кандидата
```
HR → Frontend → Backend → AI Service (парсинг резюме) → Сохранение
```

#### 2.2.3 Автоматический матчинг
```
Триггер → AI Service → Загрузка вакансий и кандидатов →
→ Векторизация → Расчет similarity → Оценка 1-10 →
→ Категоризация → Сохранение результатов → Уведомление HR
```

### 2.3 Технологический стек

#### Backend (Node.js)
- Express.js - REST API
- TypeScript - типизация
- JSON files - хранение данных (MVP)

#### AI Service (Python)
- **FastAPI** - веб-фреймворк
- **spaCy** - NLP для парсинга и анализа
- **scikit-learn** - ML алгоритмы (TF-IDF, cosine similarity)
- **sentence-transformers** - семантические эмбеддинги (BERT)
- **pydantic** - валидация данных

---

## 3. АЛГОРИТМ МАТЧИНГА

### 3.1 Этапы обработки

#### Этап 1: Предобработка текста
```python
def preprocess_text(text: str) -> str:
    """
    1. Приведение к нижнему регистру
    2. Удаление спецсимволов
    3. Токенизация
    4. Лемматизация (Python → python, программировал → программировать)
    5. Удаление стоп-слов (в, на, и, т.д.)
    """
```

#### Этап 2: Извлечение признаков
```python
def extract_features(resume: dict) -> dict:
    """
    Извлекаем:
    - Навыки (skills): Python, SQL, Docker
    - Опыт работы (years_of_experience): 3.5 лет
    - Образование (education): Высшее, Магистр
    - Достижения (achievements): Увеличил производительность на 40%
    - Языки программирования
    - Инструменты и технологии
    """
```

#### Этап 3: Векторизация

**Метод 1: TF-IDF (быстрый, базовый)**
```python
from sklearn.feature_extraction.text import TfidfVectorizer

vectorizer = TfidfVectorizer(
    max_features=1000,
    ngram_range=(1, 2),  # унигрaммы и биграммы
    min_df=1,
    stop_words='russian'
)

# Преобразуем текст в числовой вектор
vacancy_vector = vectorizer.fit_transform([vacancy_text])
candidate_vector = vectorizer.transform([candidate_text])
```

**Метод 2: BERT Embeddings (точный, семантический)**
```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

# Создаем семантические эмбеддинги
vacancy_embedding = model.encode(vacancy_text)
candidate_embedding = model.encode(candidate_text)
```

#### Этап 4: Расчет сходства (Cosine Similarity)
```python
from sklearn.metrics.pairwise import cosine_similarity

# Косинусное сходство (от -1 до 1, обычно 0 до 1)
similarity = cosine_similarity(vacancy_vector, candidate_vector)[0][0]

# Результат: 0.0 = полностью разные, 1.0 = идентичные
```

#### Этап 5: Расчет итоговой оценки (1-10)

```python
def calculate_score(
    semantic_similarity: float,    # 0.0 - 1.0
    skills_match: dict,             # matched/required
    experience_match: float,        # 0.0 - 1.0
    education_match: bool,
    filters: dict                   # must-have/nice-to-have
) -> float:
    """
    Взвешенная оценка:
    - Семантическое сходство: 30%
    - Совпадение навыков: 40%
    - Опыт работы: 20%
    - Образование: 10%
    """
    
    # 1. Навыки (40%)
    skills_score = 0
    if skills_match['required'] > 0:
        skills_score = (skills_match['matched'] / skills_match['required']) * 4.0
    
    # 2. Семантическое сходство (30%)
    semantic_score = semantic_similarity * 3.0
    
    # 3. Опыт (20%)
    experience_score = experience_match * 2.0
    
    # 4. Образование (10%)
    education_score = 1.0 if education_match else 0.0
    
    # Итоговая оценка (1-10)
    total = skills_score + semantic_score + experience_score + education_score
    
    # Применяем must-have фильтры
    for must_have in filters.get('must_have', []):
        if not check_requirement(candidate, must_have):
            total *= 0.5  # Штраф 50% за отсутствие обязательного требования
    
    # Бонус за nice-to-have
    nice_bonus = sum(0.2 for nice in filters.get('nice_to_have', [])
                     if check_requirement(candidate, nice))
    
    return min(10.0, max(1.0, total + nice_bonus))
```

#### Этап 6: Категоризация
```python
def categorize(score: float) -> str:
    if score >= 7.0:
        return "Подходящие"        # 🟢
    elif score >= 4.0:
        return "Условно подходящие" # 🟡
    else:
        return "Не подходящие"      # 🔴
```

### 3.2 Примеры расчета

#### Пример 1: Идеальный кандидат (9.8/10)
```
Вакансия: Senior Python Developer
Требования: Python, Django, PostgreSQL, 5+ лет опыта

Кандидат: Иван Иванов
- Навыки: Python, Django, PostgreSQL, Docker, Redis
- Опыт: 6 лет разработки на Python
- Образование: Магистр Computer Science

Расчет:
- Навыки: 5/3 matched = 4.0/4.0 ✓
- Семантика: 0.95 × 3.0 = 2.85/3.0
- Опыт: 1.0 × 2.0 = 2.0/2.0 ✓
- Образование: 1.0/1.0 ✓
- Итого: 9.85 → Категория: Подходящие 🟢
```

#### Пример 2: Средний кандидат (5.2/10)
```
Вакансия: Frontend Developer (React)
Требования: React, TypeScript, CSS, 2+ года

Кандидат: Мария Петрова
- Навыки: JavaScript, HTML, CSS, jQuery
- Опыт: 1.5 года frontend
- Образование: Высшее (не IT)

Расчет:
- Навыки: 1/3 matched = 1.33/4.0
- Семантика: 0.65 × 3.0 = 1.95/3.0
- Опыт: 0.75 × 2.0 = 1.5/2.0
- Образование: 0.5/1.0
- Итого: 5.28 → Категория: Условно подходящие 🟡
```

#### Пример 3: Несоответствующий кандидат (2.1/10)
```
Вакансия: Data Scientist
Требования: Python, ML, статистика, 3+ года

Кандидат: Петр Сидоров
- Навыки: Java, Spring Boot, SQL
- Опыт: 4 года backend разработки
- Образование: Высшее техническое

Расчет:
- Навыки: 0/4 matched = 0/4.0
- Семантика: 0.25 × 3.0 = 0.75/3.0
- Опыт: 0.8 × 2.0 = 1.6/2.0
- Образование: 0.5/1.0
- Итого: 2.85 × 0.5 (штраф) = 1.43 → Категория: Не подходящие 🔴
```

---

## 4. СИСТЕМА ФИЛЬТРОВ

### 4.1 Структура фильтров

```typescript
interface VacancyFilters {
  must_have: FilterCriterion[];      // Обязательные требования
  nice_to_have: FilterCriterion[];   // Желательные навыки
  dealbreakers: FilterCriterion[];   // Исключающие факторы
}

interface FilterCriterion {
  type: 'skill' | 'experience' | 'education' | 'language' | 'location';
  value: string | number;
  weight: number;  // 1-5 (важность)
  operator: '=' | '>' | '<' | 'contains' | 'any_of';
}
```

### 4.2 Примеры фильтров по отраслям

#### IT-вакансии: Backend Developer
```json
{
  "must_have": [
    { "type": "skill", "value": "Python", "weight": 5, "operator": "contains" },
    { "type": "skill", "value": "Django|Flask|FastAPI", "weight": 4, "operator": "any_of" },
    { "type": "experience", "value": 3, "weight": 4, "operator": ">" }
  ],
  "nice_to_have": [
    { "type": "skill", "value": "Docker", "weight": 2, "operator": "contains" },
    { "type": "skill", "value": "PostgreSQL", "weight": 3, "operator": "contains" },
    { "type": "skill", "value": "Redis", "weight": 2, "operator": "contains" },
    { "type": "education", "value": "Computer Science", "weight": 2, "operator": "contains" }
  ],
  "dealbreakers": [
    { "type": "experience", "value": 1, "weight": 5, "operator": "<" }
  ]
}
```

#### IT-вакансии: Frontend Developer
```json
{
  "must_have": [
    { "type": "skill", "value": "React|Vue|Angular", "weight": 5, "operator": "any_of" },
    { "type": "skill", "value": "JavaScript|TypeScript", "weight": 5, "operator": "any_of" },
    { "type": "experience", "value": 2, "weight": 3, "operator": ">" }
  ],
  "nice_to_have": [
    { "type": "skill", "value": "TypeScript", "weight": 3, "operator": "contains" },
    { "type": "skill", "value": "Redux|MobX|Zustand", "weight": 2, "operator": "any_of" },
    { "type": "skill", "value": "Webpack|Vite", "weight": 2, "operator": "any_of" },
    { "type": "skill", "value": "CSS|SCSS|Tailwind", "weight": 2, "operator": "any_of" }
  ]
}
```

#### IT-вакансии: DevOps Engineer
```json
{
  "must_have": [
    { "type": "skill", "value": "Docker", "weight": 5, "operator": "contains" },
    { "type": "skill", "value": "Kubernetes|K8s", "weight": 4, "operator": "any_of" },
    { "type": "skill", "value": "CI/CD|Jenkins|GitLab", "weight": 4, "operator": "any_of" },
    { "type": "experience", "value": 2, "weight": 3, "operator": ">" }
  ],
  "nice_to_have": [
    { "type": "skill", "value": "Terraform", "weight": 3, "operator": "contains" },
    { "type": "skill", "value": "AWS|Azure|GCP", "weight": 3, "operator": "any_of" },
    { "type": "skill", "value": "Ansible", "weight": 2, "operator": "contains" },
    { "type": "skill", "value": "Prometheus|Grafana", "weight": 2, "operator": "any_of" }
  ]
}
```

#### Маркетинг: Digital Marketing Manager
```json
{
  "must_have": [
    { "type": "skill", "value": "SEO", "weight": 5, "operator": "contains" },
    { "type": "skill", "value": "Google Analytics", "weight": 4, "operator": "contains" },
    { "type": "skill", "value": "контент-маркетинг", "weight": 4, "operator": "contains" },
    { "type": "experience", "value": 3, "weight": 4, "operator": ">" }
  ],
  "nice_to_have": [
    { "type": "skill", "value": "Google Ads|Яндекс.Директ", "weight": 3, "operator": "any_of" },
    { "type": "skill", "value": "SMM|социальные сети", "weight": 2, "operator": "any_of" },
    { "type": "skill", "value": "Email-маркетинг", "weight": 2, "operator": "contains" },
    { "type": "education", "value": "маркетинг|реклама", "weight": 2, "operator": "contains" }
  ]
}
```

#### Продажи: Sales Manager
```json
{
  "must_have": [
    { "type": "skill", "value": "B2B|B2C|продажи", "weight": 5, "operator": "any_of" },
    { "type": "skill", "value": "CRM|Битрикс24|amoCRM", "weight": 4, "operator": "any_of" },
    { "type": "experience", "value": 2, "weight": 4, "operator": ">" }
  ],
  "nice_to_have": [
    { "type": "skill", "value": "холодные звонки", "weight": 3, "operator": "contains" },
    { "type": "skill", "value": "переговоры", "weight": 3, "operator": "contains" },
    { "type": "skill", "value": "английский язык", "weight": 2, "operator": "contains" }
  ]
}
```

### 4.3 Словарь синонимов и эквивалентов

```python
SKILL_SYNONYMS = {
    # Языки программирования
    "python": ["python3", "python2", "питон"],
    "javascript": ["js", "es6", "es2015", "ecmascript", "джаваскрипт"],
    "typescript": ["ts", "тайпскрипт"],
    
    # Фреймворки
    "react": ["reactjs", "react.js", "реакт"],
    "vue": ["vuejs", "vue.js"],
    "angular": ["angularjs", "angular2+"],
    "django": ["джанго"],
    "flask": ["фласк"],
    
    # Базы данных
    "postgresql": ["postgres", "pg", "постгрес"],
    "mysql": ["my sql"],
    "mongodb": ["mongo", "монго"],
    
    # DevOps
    "kubernetes": ["k8s", "кубер"],
    "docker": ["докер"],
    "ci/cd": ["cicd", "continuous integration"],
    
    # Soft skills
    "teamwork": ["командная работа", "работа в команде"],
    "leadership": ["лидерство", "руководство"],
    "communication": ["коммуникация", "общение"]
}

EXPERIENCE_LEVELS = {
    "junior": {"years": (0, 2), "keywords": ["junior", "джуниор", "начинающий"]},
    "middle": {"years": (2, 5), "keywords": ["middle", "миддл", "опытный"]},
    "senior": {"years": (5, 100), "keywords": ["senior", "сеньор", "ведущий", "старший"]}
}
```

---

## 5. РЕАЛИЗАЦИЯ

### 5.1 Структура AI-сервиса

```
ai/
├── app.py                 # FastAPI приложение
├── requirements.txt       # Зависимости Python
├── config.py             # Конфигурация
├── models/
│   ├── __init__.py
│   ├── candidate.py      # Модель кандидата
│   ├── vacancy.py        # Модель вакансии
│   └── match.py          # Модель матча
├── services/
│   ├── __init__.py
│   ├── nlp_service.py    # NLP обработка
│   ├── matcher_service.py # Алгоритм матчинга
│   ├── vectorizer.py     # Векторизация
│   └── parser_service.py # Парсинг резюме
├── utils/
│   ├── __init__.py
│   ├── synonyms.py       # Словари синонимов
│   ├── filters.py        # Обработка фильтров
│   └── scoring.py        # Расчет оценок
└── tests/
    ├── test_nlp.py
    ├── test_matcher.py
    └── test_integration.py
```

### 5.2 API Endpoints

#### POST /api/match/analyze
Анализ одного кандидата для одной вакансии
```json
Request:
{
  "vacancy_id": "vac-001",
  "candidate_id": "cand-123"
}

Response:
{
  "match": {
    "score": 8.5,
    "category": "Подходящие",
    "explanation": "Кандидат имеет 5/5 требуемых навыков...",
    "details": {
      "skills_match": {"matched": 5, "required": 5, "score": 4.0},
      "semantic_similarity": 0.87,
      "experience_match": 1.0,
      "education_match": true
    }
  }
}
```

#### POST /api/match/batch
Массовый анализ всех кандидатов для вакансии
```json
Request:
{
  "vacancy_id": "vac-001",
  "auto_categorize": true
}

Response:
{
  "matches": [
    {
      "candidate_id": "cand-123",
      "score": 8.5,
      "category": "Подходящие",
      "explanation": "..."
    },
    ...
  ],
  "summary": {
    "total": 50,
    "suitable": 12,
    "conditional": 23,
    "unsuitable": 15
  }
}
```

#### POST /api/parse/resume
Парсинг резюме (из текста или файла)
```json
Request:
{
  "text": "Опыт работы: 5 лет Python разработчиком...",
  "format": "text"  // или "pdf", "docx"
}

Response:
{
  "parsed": {
    "skills": ["Python", "Django", "PostgreSQL"],
    "experience_years": 5,
    "education": "Высшее техническое",
    "achievements": ["Оптимизировал запросы к БД..."],
    "languages": ["Русский", "Английский (B2)"]
  }
}
```

---

## 6. ИНТЕГРАЦИИ

### 6.1 Источники резюме

#### HeadHunter API (hh.ru)
```python
import requests

def fetch_resumes_from_hh(vacancy_text: str, count: int = 50):
    """
    Поиск резюме на HH.ru по ключевым словам
    """
    url = "https://api.hh.ru/resumes"
    params = {
        "text": vacancy_text,
        "per_page": count,
        "area": 1  # Москва
    }
    response = requests.get(url, params=params)
    return response.json()
```

#### LinkedIn API (требуется партнерский доступ)
```python
# Используется для премиум подписчиков
```

#### Загрузка файлов (PDF, DOCX)
```python
from PyPDF2 import PdfReader
from docx import Document

def parse_pdf(file_path: str) -> str:
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text()
    return text

def parse_docx(file_path: str) -> str:
    doc = Document(file_path)
    return "\n".join([para.text for para in doc.paragraphs])
```

### 6.2 Автоматические отчеты

#### Email-уведомления
```python
def send_match_notification(hr_email: str, matches: list):
    """
    Отправка email с результатами матчинга
    """
    suitable = [m for m in matches if m['score'] >= 7]
    
    email_body = f"""
    Новые результаты матчинга для вакансии:
    
    🟢 Подходящих кандидатов: {len(suitable)}
    
    Топ-3 кандидата:
    {format_top_candidates(suitable[:3])}
    
    Перейти в систему: https://crm.company.com/matches
    """
    
    send_email(hr_email, "Результаты матчинга", email_body)
```

#### Telegram-бот
```python
import telebot

bot = telebot.TeleBot("YOUR_BOT_TOKEN")

def notify_telegram(chat_id: str, matches: list):
    message = f"✅ Найдено {len(matches)} подходящих кандидатов!"
    bot.send_message(chat_id, message)
```

---

## 7. ТЕСТИРОВАНИЕ

### 7.1 Unit-тесты

```python
# tests/test_matcher.py
import pytest
from services.matcher_service import calculate_similarity

def test_perfect_match():
    """Тест идеального совпадения"""
    vacancy = {"skills": ["Python", "Django", "SQL"]}
    candidate = {"skills": ["Python", "Django", "SQL", "Docker"]}
    
    score = calculate_similarity(vacancy, candidate)
    assert score >= 9.0

def test_partial_match():
    """Тест частичного совпадения"""
    vacancy = {"skills": ["React", "TypeScript", "CSS"]}
    candidate = {"skills": ["React", "JavaScript"]}
    
    score = calculate_similarity(vacancy, candidate)
    assert 4.0 <= score <= 6.0

def test_no_match():
    """Тест отсутствия совпадения"""
    vacancy = {"skills": ["Python"]}
    candidate = {"skills": ["Java"]}
    
    score = calculate_similarity(vacancy, candidate)
    assert score <= 3.0
```

### 7.2 Интеграционные тесты

```python
# tests/test_integration.py
import pytest
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_full_matching_flow():
    """Тест полного процесса матчинга"""
    
    # 1. Создаем вакансию
    vacancy = {
        "title": "Python Developer",
        "requirements": {
            "skills": ["Python", "Django"],
            "experience": 3
        }
    }
    
    # 2. Загружаем кандидата
    candidate = {
        "name": "Иван Иванов",
        "resume": "5 лет опыта в Python, Django, PostgreSQL..."
    }
    
    # 3. Запускаем матчинг
    response = client.post("/api/match/analyze", json={
        "vacancy": vacancy,
        "candidate": candidate
    })
    
    assert response.status_code == 200
    result = response.json()
    assert "score" in result
    assert 1 <= result["score"] <= 10
    assert result["category"] in ["Подходящие", "Условно подходящие", "Не подходящие"]
```

### 7.3 Тестирование точности

```python
def test_accuracy_on_labeled_data():
    """
    Тест точности на размеченных данных
    """
    # Загружаем размеченный датасет (HR оценил вручную)
    test_cases = load_labeled_dataset()
    
    correct = 0
    total = len(test_cases)
    
    for case in test_cases:
        predicted_score = calculate_similarity(case['vacancy'], case['candidate'])
        actual_score = case['hr_score']
        
        # Допускаем погрешность ±1 балл
        if abs(predicted_score - actual_score) <= 1:
            correct += 1
    
    accuracy = correct / total
    print(f"Точность модели: {accuracy * 100:.1f}%")
    
    assert accuracy >= 0.75  # Минимум 75% точности
```

---

## 8. РАЗВЕРТЫВАНИЕ

### 8.1 Локальная разработка

```bash
# 1. Установка зависимостей
cd ai
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt

# 2. Загрузка spaCy модели
python -m spacy download ru_core_news_lg

# 3. Запуск сервера
uvicorn app:app --reload --port 8001

# 4. Проверка здоровья
curl http://localhost:8001/health
```

### 8.2 Production (Docker)

```dockerfile
# ai/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Копируем requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Загружаем spaCy модель
RUN python -m spacy download ru_core_news_lg

# Копируем код
COPY . .

# Открываем порт
EXPOSE 8001

# Запускаем приложение
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
```

```yaml
# docker-compose.yml
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
    environment:
      - MODEL_PATH=/models
    volumes:
      - ./ai/models:/models
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

---

## 9. ПОТЕНЦИАЛЬНЫЕ ВЫЗОВЫ И РЕШЕНИЯ

### 9.1 Обработка неструктурированных данных

**Проблема**: Резюме в разных форматах (PDF, DOCX, HTML)

**Решение**:
```python
# Универсальный парсер с fallback
def parse_resume(file_content: bytes, file_type: str) -> str:
    try:
        if file_type == 'pdf':
            return parse_pdf(file_content)
        elif file_type == 'docx':
            return parse_docx(file_content)
        else:
            # OCR для изображений
            return ocr_parse(file_content)
    except Exception as e:
        logger.error(f"Parse error: {e}")
        return ""  # Возвращаем пустую строку, но не падаем
```

### 9.2 Конфиденциальность данных (GDPR)

**Проблема**: Хранение персональных данных кандидатов

**Решения**:
1. **Анонимизация**: Удаление имен, адресов, фото
2. **Шифрование**: AES-256 для хранения данных
3. **Право на забвение**: API для удаления данных
4. **Срок хранения**: Автоматическое удаление через 6 месяцев
5. **Логирование доступа**: Аудит всех операций

```python
from cryptography.fernet import Fernet

class GDPRCompliance:
    def __init__(self):
        self.cipher = Fernet(settings.ENCRYPTION_KEY)
    
    def anonymize_resume(self, resume: dict) -> dict:
        """Удаляем персональные данные"""
        return {
            "candidate_id": resume["id"],  # Только ID
            "skills": resume["skills"],
            "experience": resume["experience"],
            # Удаляем: имя, телефон, email, адрес, фото
        }
    
    def encrypt_sensitive_data(self, data: str) -> str:
        """Шифруем чувствительные данные"""
        return self.cipher.encrypt(data.encode()).decode()
    
    def schedule_deletion(self, candidate_id: str, days: int = 180):
        """Планируем автоудаление"""
        deletion_date = datetime.now() + timedelta(days=days)
        # Добавляем в очередь на удаление
```

### 9.3 Точность матчинга

**Проблема**: Ложные срабатывания, неточные оценки

**Решения**:
1. **A/B тестирование**: Сравнение разных алгоритмов
2. **Feedback loop**: HR оценивают результаты → переобучение
3. **Ансамбли моделей**: Комбинация TF-IDF + BERT
4. **Пороги уверенности**: Помечать сомнительные случаи

```python
class EnsembleMatcher:
    def __init__(self):
        self.tfidf_matcher = TFIDFMatcher()
        self.bert_matcher = BERTMatcher()
    
    def match(self, vacancy, candidate):
        # Получаем оценки от обеих моделей
        tfidf_score = self.tfidf_matcher.score(vacancy, candidate)
        bert_score = self.bert_matcher.score(vacancy, candidate)
        
        # Взвешенная комбинация (BERT точнее, но медленнее)
        final_score = 0.3 * tfidf_score + 0.7 * bert_score
        
        # Флаг неуверенности
        confidence = 1.0 - abs(tfidf_score - bert_score)
        
        return {
            "score": final_score,
            "confidence": confidence,
            "needs_review": confidence < 0.7  # Требует проверки HR
        }
```

### 9.4 Производительность

**Проблема**: Медленная обработка при больших объемах

**Решения**:
1. **Кэширование**: Redis для векторов и результатов
2. **Батч-обработка**: Обработка по 100 кандидатов за раз
3. **Асинхронность**: Celery/RQ для фоновых задач
4. **Индексация**: Elasticsearch для быстрого поиска

```python
from celery import Celery
import redis

celery_app = Celery('hr_crm', broker='redis://localhost:6379')
cache = redis.Redis(host='localhost', port=6379)

@celery_app.task
def match_candidates_async(vacancy_id: str):
    """Асинхронный матчинг в фоне"""
    candidates = fetch_candidates()
    
    results = []
    for batch in chunks(candidates, size=100):
        # Обрабатываем батчами
        batch_results = process_batch(vacancy_id, batch)
        results.extend(batch_results)
    
    # Сохраняем результаты
    save_matches(vacancy_id, results)
    
    # Отправляем уведомление
    notify_hr(vacancy_id, results)
```

---

## 10. МЕТРИКИ И KPI

### 10.1 Технические метрики

- **Точность (Accuracy)**: % правильных категоризаций
- **Precision**: Доля действительно подходящих среди отмеченных
- **Recall**: Доля найденных подходящих из всех существующих
- **F1-Score**: Гармоническое среднее Precision и Recall
- **Время обработки**: < 2 сек на 1 кандидата

### 10.2 Бизнес-метрики

- **Time to hire**: Сокращение на 30% (цель: с 45 до 32 дней)
- **Quality of hire**: Увеличение на 25% (retention rate)
- **HR productivity**: Экономия 15 часов/неделю на ручной отбор
- **Candidate satisfaction**: NPS > 50

### 10.3 Мониторинг

```python
from prometheus_client import Counter, Histogram, Gauge

# Счетчики
matches_processed = Counter('matches_processed_total', 'Обработано матчей')
api_requests = Counter('api_requests_total', 'API запросы', ['endpoint'])

# Время обработки
processing_time = Histogram('processing_seconds', 'Время обработки')

# Текущие значения
current_matches = Gauge('current_matches', 'Активные матчи')

@processing_time.time()
def process_match(vacancy, candidate):
    matches_processed.inc()
    # ... логика матчинга
```

---

## ИТОГИ

Система готова к реализации поэтапно:

1. **Неделя 1-2**: Базовый AI-сервис + TF-IDF матчинг
2. **Неделя 3**: Интеграция с backend, API endpoints
3. **Неделя 4**: BERT embeddings, улучшение точности
4. **Неделя 5**: Фильтры, категоризация, UI
5. **Неделя 6**: Тестирование, оптимизация
6. **Неделя 7**: Интеграции (HH.ru, email), мониторинг
7. **Неделя 8**: Production deployment, документация

**Ожидаемые результаты**:
- ⚡ Ускорение отбора кандидатов в 5-10 раз
- 🎯 Точность матчинга 75-85%
- 📊 Прозрачная логика принятия решений
- 🔄 Непрерывное улучшение через feedback

**Готово к старту!** 🚀

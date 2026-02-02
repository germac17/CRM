# Архитектура

## Рекомендуемый стек
### Frontend
- React или Next.js
- TypeScript
- Tailwind CSS или MUI
- Figma для дизайн-системы

### Backend
- Node.js (NestJS или Express)
- TypeScript
- Python (FastAPI) для ИИ модулей
- GraphQL или REST для интеграций

### Данные
- PostgreSQL (основная реляционная БД)
- Redis (кэш, очереди, лимиты запросов)
- Elasticsearch (поиск и матчинг)

### ИИ/ML
- Python (scikit-learn, PyTorch, TensorFlow)
- HuggingFace для NLP и эмбеддингов
- Собственные ML пайплайны для объяснимого матчинга

### Инфраструктура
- Kubernetes
- Docker
- AWS или GCP
- Prometheus + Grafana
- Vault
- Sentry

### Безопасность и комплаенс
- OAuth2 / OpenID Connect
- TLS
- RBAC
- Набор инструментов для GDPR

## Сервисная схема (предложение)
- `api-gateway` (аутентификация, RBAC, маршрутизация)
- `recruitment-service` (вакансии, этапы, офферы)
- `talent-service` (профили кандидатов и сотрудников)
- `communication-service` (шаблоны email/SMS/чата)
- `calendar-service` (планирование и доступность)
- `workflow-service` (онбординг/оффбординг автоматизация)
- `analytics-service` (метрики, дашборды)
- `ai-service` (граф навыков, матчинг, объяснимость)
- `search-service` (индексация и поиск в Elasticsearch)

## Потоки данных (кратко)
- Загрузка резюме и профилей в `talent-service`
- Генерация эмбеддингов и графа навыков в `ai-service`
- Индексация полей поиска в `search-service`
- Ранжирование рекомендаций через `recruitment-service`

## API стратегия
- API-first с версионированными эндпоинтами
- Событийные точки интеграции с внешними платформами
- Вебхуки для входящих данных от партнеров

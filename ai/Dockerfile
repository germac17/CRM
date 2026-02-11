# Dockerfile для AI-сервиса
FROM python:3.11-slim

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Рабочая директория
WORKDIR /app

# Копирование requirements
COPY requirements.txt .

# Установка Python пакетов
RUN pip install --no-cache-dir -r requirements.txt

# Загрузка spaCy модели
RUN python -m spacy download ru_core_news_md

# Копирование кода
COPY . .

# Открываем порт
EXPOSE 8001

# Переменные окружения
ENV API_HOST=0.0.0.0
ENV API_PORT=8001
ENV LOG_LEVEL=INFO

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8001/health')"

# Запуск приложения
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]

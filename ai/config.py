"""
Конфигурация AI-сервиса
"""
import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR.parent / "backend" / "data"

# API Settings
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("PORT", os.getenv("API_PORT", "8001")))

# Backend Integration
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:4000")

# NLP Models
SPACY_MODEL = "ru_core_news_md"  # или ru_core_news_lg для production
SENTENCE_TRANSFORMER_MODEL = "paraphrase-multilingual-MiniLM-L12-v2"

# Matching Settings
MIN_SCORE = 1.0
MAX_SCORE = 10.0

# Scoring Weights
WEIGHTS = {
    "skills": 0.40,          # 40% - навыки
    "semantic": 0.30,        # 30% - семантическое сходство
    "experience": 0.20,      # 20% - опыт
    "education": 0.10,       # 10% - образование
}

# Category Thresholds
CATEGORY_THRESHOLDS = {
    "suitable": 7.0,          # >= 7.0 - Подходящие
    "conditional": 4.0,       # 4.0-6.9 - Условно подходящие
    # < 4.0 - Не подходящие
}

# Performance
BATCH_SIZE = 100
MAX_CANDIDATES_PER_REQUEST = 500

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

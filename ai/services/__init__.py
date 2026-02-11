"""
Сервисы AI-системы
"""
from .nlp_service import NLPService
from .vectorizer import Vectorizer
from .matcher_service import MatcherService
from .parser_service import ParserService

__all__ = [
    "NLPService",
    "Vectorizer",
    "MatcherService",
    "ParserService",
]

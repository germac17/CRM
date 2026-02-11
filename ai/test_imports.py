"""Тест импортов"""
print("1. Тест импорта FastAPI...")
from fastapi import FastAPI
print("   OK")

print("2. Тест импорта pydantic...")
from pydantic import BaseModel
print("   OK")

print("3. Тест импорта моделей...")
from models import Candidate, Vacancy
print("   OK")

print("4. Тест импорта spaCy...")
import spacy
print("   OK - загрузка модели...")
nlp = spacy.load("ru_core_news_md")
print("   Модель загружена!")

print("5. Тест импорта sentence-transformers...")
from sentence_transformers import SentenceTransformer
print("   OK - это может занять время при первом запуске...")

print("\nВсе тесты пройдены успешно!")

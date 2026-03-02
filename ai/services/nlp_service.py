"""
NLP сервис для обработки текста
"""
import re
from typing import List
import config


class NLPService:
    """Сервис для NLP обработки текста"""
    
    def __init__(self):
        """Инициализация NLP сервиса"""
        self.nlp = None
        self._load_spacy_model()
    
    def _load_spacy_model(self):
        """Загрузка spaCy модели"""
        try:
            import spacy
            self.nlp = spacy.load(config.SPACY_MODEL)
        except OSError:
            # Модель не установлена, используем базовую обработку
            print(f"spaCy модель '{config.SPACY_MODEL}' не найдена.")
            print("Установите: python -m spacy download ru_core_news_md")
            self.nlp = None
    
    def preprocess_text(self, text: str) -> str:
        """
        Предобработка текста
        
        Args:
            text: Исходный текст
        
        Returns:
            Обработанный текст
        """
        # Приведение к нижнему регистру
        text = text.lower()
        
        # Удаление лишних пробелов
        text = re.sub(r'\s+', ' ', text)
        
        # Удаление спецсимволов (кроме букв, цифр и базовых знаков)
        text = re.sub(r'[^\w\s\+\#\.\-]', ' ', text)
        
        return text.strip()
    
    def tokenize(self, text: str) -> List[str]:
        """
        Токенизация текста
        
        Args:
            text: Текст для токенизации
        
        Returns:
            Список токенов
        """
        if self.nlp:
            doc = self.nlp(text)
            return [token.text for token in doc]
        else:
            # Простая токенизация по пробелам
            return text.split()
    
    def lemmatize(self, text: str) -> str:
        """
        Лемматизация текста (приведение слов к базовой форме)
        
        Args:
            text: Текст для лемматизации
        
        Returns:
            Лемматизированный текст
        """
        if self.nlp:
            doc = self.nlp(text)
            lemmas = [token.lemma_ for token in doc if not token.is_stop]
            return " ".join(lemmas)
        else:
            # Без spaCy просто возвращаем предобработанный текст
            return self.preprocess_text(text)
    
    def extract_skills_from_text(self, text: str) -> List[str]:
        """
        Извлечение навыков из текста
        
        Args:
            text: Текст для анализа
        
        Returns:
            Список найденных навыков
        """
        # Список популярных технических навыков
        common_skills = [
            # Языки программирования
            "python", "java", "javascript", "typescript", "c++", "c#", "go",
            "rust", "php", "ruby", "swift", "kotlin", "scala",
            
            # Frontend
            "react", "vue", "angular", "html", "css", "sass", "less",
            "webpack", "vite", "redux", "mobx",
            
            # Backend
            "django", "flask", "fastapi", "express", "nest.js", "spring",
            "node.js", "asp.net",
            
            # Базы данных
            "sql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
            "cassandra", "oracle",
            
            # DevOps
            "docker", "kubernetes", "k8s", "ci/cd", "jenkins", "gitlab",
            "github actions", "terraform", "ansible", "aws", "azure", "gcp",
            
            # Тестирование
            "pytest", "jest", "selenium", "cypress", "junit", "testing",
            
            # Методологии
            "agile", "scrum", "kanban", "tdd", "devops",
            
            # Data Science
            "machine learning", "deep learning", "pandas", "numpy",
            "tensorflow", "pytorch", "scikit-learn",
            
            # Маркетинг
            "seo", "smm", "google analytics", "google ads", "яндекс.директ",
            "контент-маркетинг", "email-маркетинг",
            
            # CRM
            "bitrix24", "amocrm", "salesforce", "hubspot",
            
            # Дизайн
            "figma", "photoshop", "illustrator", "sketch", "adobe xd",
        ]
        
        text_lower = text.lower()
        found_skills = []
        
        for skill in common_skills:
            if skill in text_lower:
                found_skills.append(skill)
        
        return found_skills
    
    def extract_named_entities(self, text: str) -> dict:
        """
        Извлечение именованных сущностей (названия компаний, технологий и т.д.)
        
        Args:
            text: Текст для анализа
        
        Returns:
            Словарь с сущностями по типам
        """
        if not self.nlp:
            return {"skills": self.extract_skills_from_text(text)}
        
        doc = self.nlp(text)
        entities = {
            "organizations": [],
            "technologies": [],
            "skills": []
        }
        
        for ent in doc.ents:
            if ent.label_ == "ORG":
                entities["organizations"].append(ent.text)
            elif ent.label_ == "MISC":
                entities["technologies"].append(ent.text)
        
        # Добавляем извлеченные навыки
        entities["skills"] = self.extract_skills_from_text(text)
        
        return entities
    
    def calculate_text_similarity(self, text1: str, text2: str) -> float:
        """
        Рассчитывает семантическое сходство между двумя текстами
        используя spaCy векторы
        
        Args:
            text1: Первый текст
            text2: Второй текст
        
        Returns:
            Сходство (0.0-1.0)
        """
        if not self.nlp:
            # Простое сравнение по пересечению слов
            words1 = set(self.preprocess_text(text1).split())
            words2 = set(self.preprocess_text(text2).split())
            
            if not words1 or not words2:
                return 0.0
            
            intersection = len(words1 & words2)
            union = len(words1 | words2)
            
            return intersection / union if union > 0 else 0.0
        
        # Используем spaCy для семантического сравнения
        doc1 = self.nlp(text1)
        doc2 = self.nlp(text2)
        
        return doc1.similarity(doc2)

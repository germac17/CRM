"""
Сервис для парсинга резюме
"""
import re
from typing import Dict
from models.candidate import CandidateResume
from services.nlp_service import NLPService
from utils.synonyms import extract_years_of_experience


class ParserService:
    """Сервис для парсинга резюме из текста"""
    
    def __init__(self):
        """Инициализация парсера"""
        self.nlp = NLPService()
    
    def parse_resume_text(self, text: str) -> CandidateResume:
        """
        Парсинг резюме из текста
        
        Args:
            text: Текст резюме
        
        Returns:
            Структурированное резюме
        """
        # Предобработка текста
        clean_text = self.nlp.preprocess_text(text)
        
        # Извлекаем компоненты
        skills = self._extract_skills(clean_text)
        experience_years = self._extract_experience(clean_text)
        education = self._extract_education(clean_text)
        achievements = self._extract_achievements(text)
        languages = self._extract_languages(clean_text)
        
        return CandidateResume(
            skills=skills,
            experience_years=experience_years,
            education=education,
            achievements=achievements,
            languages=languages,
            raw_text=text
        )
    
    def _extract_skills(self, text: str) -> list[str]:
        """Извлечение навыков из текста"""
        skills = self.nlp.extract_skills_from_text(text)
        
        # Дополнительно ищем в секциях "Навыки:", "Skills:", "Технологии:"
        skill_sections = re.findall(
            r'(?:навыки|skills|технологии|стек)[:.\s]+(.*?)(?:\n\n|\n[А-ЯA-Z]|$)',
            text,
            re.IGNORECASE | re.DOTALL
        )
        
        for section in skill_sections:
            # Разделяем по запятым, точкам с запятой
            items = re.split(r'[,;•\n]', section)
            for item in items:
                skill = item.strip()
                if skill and len(skill) > 2 and len(skill) < 30:
                    skills.append(skill.lower())
        
        # Убираем дубликаты
        return list(set(skills))
    
    def _extract_experience(self, text: str) -> float:
        """Извлечение опыта работы"""
        return extract_years_of_experience(text)
    
    def _extract_education(self, text: str) -> str:
        """Извлечение образования"""
        education_keywords = [
            "университет", "институт", "вуз", "магистр", "бакалавр",
            "высшее", "среднее специальное", "колледж", "техникум",
            "мгу", "мфти", "спбгу", "итмо", "вшэ"
        ]
        
        # Ищем секцию "Образование"
        education_match = re.search(
            r'(?:образование|education)[:.\s]+(.*?)(?:\n\n|\n[А-ЯA-Z]|$)',
            text,
            re.IGNORECASE | re.DOTALL
        )
        
        if education_match:
            education_text = education_match.group(1).strip()
            return education_text[:200]  # Ограничиваем длину
        
        # Ищем ключевые слова
        text_lower = text.lower()
        for keyword in education_keywords:
            if keyword in text_lower:
                # Извлекаем предложение с этим словом
                sentences = text.split('.')
                for sentence in sentences:
                    if keyword in sentence.lower():
                        return sentence.strip()[:200]
        
        return ""
    
    def _extract_achievements(self, text: str) -> list[str]:
        """Извлечение достижений"""
        achievements = []
        
        # Ищем секцию "Достижения"
        achievements_match = re.search(
            r'(?:достижения|achievements|результаты)[:.\s]+(.*?)(?:\n\n|\n[А-ЯA-Z]|$)',
            text,
            re.IGNORECASE | re.DOTALL
        )
        
        if achievements_match:
            achievements_text = achievements_match.group(1)
            # Разделяем по маркерам списка
            items = re.split(r'[•\-\*]\s*|\n\d+\.\s*', achievements_text)
            for item in items:
                item = item.strip()
                if item and len(item) > 10:
                    achievements.append(item[:200])
        
        # Ищем числа с процентами (часто указывают на достижения)
        percentage_matches = re.findall(
            r'([^.]*?\d+%[^.]*\.)',
            text,
            re.IGNORECASE
        )
        
        for match in percentage_matches:
            achievement = match.strip()
            if achievement and achievement not in achievements:
                achievements.append(achievement[:200])
        
        return achievements[:5]  # Максимум 5 достижений
    
    def _extract_languages(self, text: str) -> list[str]:
        """Извлечение языков"""
        languages = []
        
        # Известные языки
        common_languages = {
            "русский": ["русский", "russian"],
            "английский": ["английский", "english", "b1", "b2", "c1", "c2", "advanced", "intermediate"],
            "немецкий": ["немецкий", "german", "deutsch"],
            "французский": ["французский", "french", "français"],
            "испанский": ["испанский", "spanish", "español"],
            "китайский": ["китайский", "chinese", "中文"],
        }
        
        text_lower = text.lower()
        
        for language, keywords in common_languages.items():
            for keyword in keywords:
                if keyword in text_lower:
                    # Пытаемся найти уровень
                    level_match = re.search(
                        rf'{keyword}\s*[-:]?\s*([a-c][12]|advanced|intermediate|beginner|fluent|свободно|базовый)',
                        text_lower
                    )
                    
                    if level_match:
                        languages.append(f"{language} ({level_match.group(1)})")
                    else:
                        languages.append(language)
                    break
        
        return list(set(languages))
    
    def parse_pdf(self, file_path: str) -> CandidateResume:
        """
        Парсинг резюме из PDF файла
        
        Args:
            file_path: Путь к PDF файлу
        
        Returns:
            Структурированное резюме
        """
        try:
            from PyPDF2 import PdfReader
            
            reader = PdfReader(file_path)
            text = ""
            for page in reader.pages:
                text += page.extract_text()
            
            return self.parse_resume_text(text)
        except Exception as e:
            print(f"Ошибка при парсинге PDF: {e}")
            return CandidateResume(raw_text="")
    
    def parse_docx(self, file_path: str) -> CandidateResume:
        """
        Парсинг резюме из DOCX файла
        
        Args:
            file_path: Путь к DOCX файлу
        
        Returns:
            Структурированное резюме
        """
        try:
            from docx import Document
            
            doc = Document(file_path)
            text = "\n".join([para.text for para in doc.paragraphs])
            
            return self.parse_resume_text(text)
        except Exception as e:
            print(f"Ошибка при парсинге DOCX: {e}")
            return CandidateResume(raw_text="")

"""
Модели матчинга
"""
from typing import Literal
from pydantic import BaseModel, Field


class MatchDetails(BaseModel):
    """Детали матчинга"""
    
    skills_match: dict = Field(
        default_factory=dict,
        description="Совпадение навыков: matched/required/score"
    )
    semantic_similarity: float = Field(default=0.0, description="Семантическое сходство 0-1")
    experience_match: float = Field(default=0.0, description="Соответствие опыта 0-1")
    education_match: bool = Field(default=False, description="Соответствие образования")
    nice_to_have_bonus: float = Field(default=0.0, description="Бонус за желательные навыки")


class Match(BaseModel):
    """Результат матчинга"""
    
    candidate_id: str = Field(..., description="ID кандидата")
    vacancy_id: str = Field(..., description="ID вакансии")
    score: float = Field(..., ge=1.0, le=10.0, description="Оценка 1-10")
    category: Literal["Подходящие", "Условно подходящие", "Не подходящие"]
    explanation: str = Field(..., description="Объяснение оценки")
    details: MatchDetails = Field(..., description="Детали расчета")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Уверенность модели")
    needs_review: bool = Field(default=False, description="Требует проверки HR")


class MatchRequest(BaseModel):
    """Запрос на матчинг одного кандидата"""
    
    vacancy_id: str
    candidate_id: str


class BatchMatchRequest(BaseModel):
    """Запрос на массовый матчинг"""
    
    vacancy_id: str
    candidate_ids: list[str] | None = None  # Если None - все кандидаты
    auto_save: bool = Field(default=True, description="Автоматически сохранить результаты")


class MatchResponse(BaseModel):
    """Ответ с результатами матчинга"""
    
    matches: list[Match]
    summary: dict = Field(default_factory=dict, description="Сводка")

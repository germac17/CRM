"""
Модели кандидата
"""
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class CandidateResume(BaseModel):
    """Структурированное резюме кандидата"""
    
    skills: list[str] = Field(default_factory=list, description="Навыки")
    experience_years: float = Field(default=0.0, description="Опыт работы в годах")
    education: str = Field(default="", description="Образование")
    achievements: list[str] = Field(default_factory=list, description="Достижения")
    languages: list[str] = Field(default_factory=list, description="Языки")
    raw_text: str = Field(default="", description="Полный текст резюме")


class Candidate(BaseModel):
    """Кандидат"""
    
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(..., description="ID кандидата")
    name: str = Field(..., description="Имя")
    role: str = Field(default="", description="Желаемая роль")
    skills: list[str] = Field(default_factory=list, description="Навыки")
    stage: str = Field(default="Скрининг", description="Этап найма")
    source: str = Field(default="", description="Источник")
    notes: str = Field(default="", description="Заметки")
    resume: Optional[CandidateResume] = Field(None, description="Детали резюме")
    
    def to_text(self) -> str:
        """Преобразование в текст для анализа"""
        parts = [
            f"Имя: {self.name}",
            f"Роль: {self.role}",
            f"Навыки: {', '.join(self.skills)}",
        ]
        
        if self.notes:
            parts.append(f"Заметки: {self.notes}")
        
        if self.resume:
            parts.append(f"Опыт: {self.resume.experience_years} лет")
            parts.append(f"Образование: {self.resume.education}")
            if self.resume.achievements:
                parts.append(f"Достижения: {'; '.join(self.resume.achievements)}")
            if self.resume.raw_text:
                parts.append(f"Резюме: {self.resume.raw_text}")
        
        return "\n".join(parts)

"""
Модели вакансии
"""
from typing import Optional, Literal
from pydantic import BaseModel, Field


class FilterCriterion(BaseModel):
    """Критерий фильтрации"""
    
    type: Literal["skill", "experience", "education", "language", "location"]
    value: str | float
    weight: int = Field(default=3, ge=1, le=5, description="Важность 1-5")
    operator: Literal["=", ">", "<", "contains", "any_of"] = "contains"


class VacancyRequirements(BaseModel):
    """Требования вакансии"""
    
    must_have: list[FilterCriterion] = Field(default_factory=list, description="Обязательные")
    nice_to_have: list[FilterCriterion] = Field(default_factory=list, description="Желательные")
    dealbreakers: list[FilterCriterion] = Field(default_factory=list, description="Исключающие")


class Vacancy(BaseModel):
    """Вакансия"""
    
    id: str = Field(..., description="ID вакансии")
    title: str = Field(..., description="Название")
    department: str = Field(default="", description="Отдел")
    location: str = Field(default="", description="Локация")
    status: str = Field(default="open", description="Статус")
    description: str = Field(default="", description="Описание")
    requirements: Optional[VacancyRequirements] = Field(None, description="Требования")
    
    def to_text(self) -> str:
        """Преобразование в текст для анализа"""
        parts = [
            f"Должность: {self.title}",
            f"Отдел: {self.department}",
            f"Локация: {self.location}",
        ]
        
        if self.description:
            parts.append(f"Описание: {self.description}")
        
        if self.requirements:
            # Must-have навыки
            must_have_skills = [
                str(c.value) for c in self.requirements.must_have 
                if c.type == "skill"
            ]
            if must_have_skills:
                parts.append(f"Обязательные навыки: {', '.join(must_have_skills)}")
            
            # Nice-to-have навыки
            nice_skills = [
                str(c.value) for c in self.requirements.nice_to_have 
                if c.type == "skill"
            ]
            if nice_skills:
                parts.append(f"Желательные навыки: {', '.join(nice_skills)}")
            
            # Опыт
            exp_requirements = [
                c for c in self.requirements.must_have 
                if c.type == "experience"
            ]
            if exp_requirements:
                exp = exp_requirements[0]
                parts.append(f"Опыт: {exp.operator} {exp.value} лет")
        
        return "\n".join(parts)
    
    def get_required_skills(self) -> list[str]:
        """Получить список обязательных навыков"""
        if not self.requirements:
            return []
        
        skills = []
        for criterion in self.requirements.must_have:
            if criterion.type == "skill":
                # Обработка any_of (например, "Python|Java|C++")
                value = str(criterion.value)
                if "|" in value:
                    skills.extend(value.split("|"))
                else:
                    skills.append(value)
        
        return [s.strip().lower() for s in skills]
    
    def get_nice_to_have_skills(self) -> list[str]:
        """Получить список желательных навыков"""
        if not self.requirements:
            return []
        
        skills = []
        for criterion in self.requirements.nice_to_have:
            if criterion.type == "skill":
                value = str(criterion.value)
                if "|" in value:
                    skills.extend(value.split("|"))
                else:
                    skills.append(value)
        
        return [s.strip().lower() for s in skills]

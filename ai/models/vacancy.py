"""
Модели вакансии
"""
from typing import Optional, Literal, Any
from pydantic import BaseModel, Field, ConfigDict


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
    
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(..., description="ID вакансии")
    title: str = Field(..., description="Название")
    department: str = Field(default="", description="Отдел")
    location: str = Field(default="", description="Локация")
    status: str = Field(default="open", description="Статус")
    description: str = Field(default="", description="Описание")
    requirements: Optional[VacancyRequirements] = Field(None, description="Требования")
    details: Optional[dict[str, Any]] = Field(None, description="Сырые поля из CRM (description, skills, …)")
    
    def _description_resolved(self) -> str:
        if self.description and str(self.description).strip():
            return str(self.description).strip()
        if self.details and isinstance(self.details, dict):
            d = str(self.details.get("description") or self.details.get("text") or "").strip()
            return d
        return ""
    
    def _skills_from_details(self) -> list[str]:
        if not self.details or not isinstance(self.details, dict):
            return []
        raw = self.details.get("skills")
        if isinstance(raw, list):
            return [str(s).strip().lower() for s in raw if s]
        return []
    
    def to_text(self) -> str:
        """Преобразование в текст для анализа"""
        parts = [
            f"Должность: {self.title}",
            f"Отдел: {self.department}",
            f"Локация: {self.location}",
        ]
        
        desc = self._description_resolved()
        if desc:
            parts.append(f"Описание: {desc}")
        
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
        
        ds = self._skills_from_details()
        if ds:
            parts.append(f"Ожидаемые навыки (форма CRM): {', '.join(ds)}")
        
        return "\n".join(parts)
    
    def get_required_skills(self) -> list[str]:
        """Получить список обязательных навыков"""
        skills: list[str] = []
        if self.requirements:
            for criterion in self.requirements.must_have:
                if criterion.type == "skill":
                    value = str(criterion.value)
                    if "|" in value:
                        skills.extend(value.split("|"))
                    else:
                        skills.append(value)
        base = [s.strip().lower() for s in skills]
        if base:
            return base
        return self._skills_from_details()
    
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

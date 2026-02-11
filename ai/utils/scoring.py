"""
Расчет оценок и финального скора
"""
import config
from models.candidate import Candidate
from models.vacancy import Vacancy
from .synonyms import find_skill_matches, extract_years_of_experience
from .filters import apply_filters, calculate_filter_penalty


def calculate_skills_score(candidate: Candidate, vacancy: Vacancy) -> dict:
    """
    Рассчитывает оценку совпадения навыков
    
    Args:
        candidate: Кандидат
        vacancy: Вакансия
    
    Returns:
        dict: matched, required, missing, score (0-4.0)
    """
    required_skills = vacancy.get_required_skills()
    candidate_skills = [s.lower().strip() for s in candidate.skills]
    
    if not required_skills:
        # Если требований нет, оцениваем по наличию любых навыков
        return {
            "matched": len(candidate_skills),
            "required": 1,
            "missing": [],
            "score": min(4.0, len(candidate_skills) * 0.5)
        }
    
    # Находим совпадения с учетом синонимов
    matches = find_skill_matches(candidate_skills, required_skills)
    
    matched_count = len(matches["matched"])
    required_count = len(required_skills)
    
    # Оценка: (совпавшие / требуемые) * 4.0
    if required_count > 0:
        ratio = matched_count / required_count
        score = ratio * 4.0
    else:
        score = 0.0
    
    return {
        "matched": matched_count,
        "required": required_count,
        "missing": matches["missing"],
        "score": round(score, 2)
    }


def calculate_experience_score(candidate: Candidate, vacancy: Vacancy) -> dict:
    """
    Рассчитывает оценку соответствия опыта
    
    Args:
        candidate: Кандидат
        vacancy: Вакансия
    
    Returns:
        dict: candidate_years, required_years, match_ratio (0-1.0), score (0-2.0)
    """
    # Получаем опыт кандидата
    candidate_years = 0.0
    if candidate.resume and candidate.resume.experience_years:
        candidate_years = candidate.resume.experience_years
    else:
        text = candidate.to_text()
        candidate_years = extract_years_of_experience(text)
    
    # Получаем требуемый опыт
    required_years = 0.0
    if vacancy.requirements:
        for criterion in vacancy.requirements.must_have:
            if criterion.type == "experience":
                try:
                    required_years = float(criterion.value)
                    break
                except (ValueError, TypeError):
                    pass
    
    # Рассчитываем соответствие
    if required_years == 0:
        # Если требования не указаны, оцениваем по наличию опыта
        match_ratio = min(1.0, candidate_years / 3.0)
    else:
        # Оптимально: опыт кандидата >= требуемого, но не сильно больше
        if candidate_years >= required_years:
            # Идеально: опыт совпадает или чуть больше
            if candidate_years <= required_years * 1.5:
                match_ratio = 1.0
            else:
                # Слишком опытный - может быть overqualified
                match_ratio = max(0.7, 1.0 - (candidate_years - required_years * 1.5) * 0.05)
        else:
            # Недостаточно опыта
            match_ratio = candidate_years / required_years
    
    score = match_ratio * 2.0  # Максимум 2.0 балла
    
    return {
        "candidate_years": candidate_years,
        "required_years": required_years,
        "match_ratio": round(match_ratio, 2),
        "score": round(score, 2)
    }


def calculate_education_score(candidate: Candidate, vacancy: Vacancy) -> dict:
    """
    Рассчитывает оценку образования
    
    Args:
        candidate: Кандидат
        vacancy: Вакансия
    
    Returns:
        dict: match (bool), score (0-1.0)
    """
    # Проверяем наличие требований к образованию
    education_required = False
    required_education = ""
    
    if vacancy.requirements:
        for criterion in vacancy.requirements.must_have:
            if criterion.type == "education":
                education_required = True
                required_education = str(criterion.value).lower()
                break
    
    # Если требования не указаны, считаем что подходит
    if not education_required:
        return {"match": True, "score": 1.0}
    
    # Проверяем образование кандидата
    candidate_education = ""
    if candidate.resume and candidate.resume.education:
        candidate_education = candidate.resume.education.lower()
    
    # Простая проверка на соответствие
    match = (
        required_education in candidate_education or
        "высшее" in candidate_education or
        "университет" in candidate_education or
        "магистр" in candidate_education
    )
    
    return {
        "match": match,
        "score": 1.0 if match else 0.3
    }


def calculate_final_score(
    skills_score: float,
    semantic_similarity: float,
    experience_score: float,
    education_score: float,
    nice_to_have_bonus: float = 0.0,
    penalty_modifier: float = 1.0
) -> float:
    """
    Рассчитывает итоговую оценку
    
    Args:
        skills_score: Оценка навыков (0-4.0)
        semantic_similarity: Семантическое сходство (0-1.0)
        experience_score: Оценка опыта (0-2.0)
        education_score: Оценка образования (0-1.0)
        nice_to_have_bonus: Бонус за желательные навыки
        penalty_modifier: Штраф за несоответствие требованиям (0.0-1.0)
    
    Returns:
        Итоговая оценка (1.0-10.0)
    """
    # Базовый расчет по весам из конфига
    base_score = (
        skills_score +  # 40% (0-4.0)
        semantic_similarity * 3.0 +  # 30% (0-3.0)
        experience_score +  # 20% (0-2.0)
        education_score  # 10% (0-1.0)
    )  # Итого: 0-10.0
    
    # Применяем бонусы и штрафы
    final = base_score + nice_to_have_bonus
    final *= penalty_modifier
    
    # Ограничиваем диапазон
    final = max(config.MIN_SCORE, min(config.MAX_SCORE, final))
    
    return round(final, 2)


def categorize_score(score: float) -> str:
    """
    Определяет категорию по оценке
    
    Args:
        score: Оценка (1-10)
    
    Returns:
        Категория: "Подходящие", "Условно подходящие", "Не подходящие"
    """
    if score >= config.CATEGORY_THRESHOLDS["suitable"]:
        return "Подходящие"
    elif score >= config.CATEGORY_THRESHOLDS["conditional"]:
        return "Условно подходящие"
    else:
        return "Не подходящие"


def generate_explanation(
    skills_data: dict,
    experience_data: dict,
    education_data: dict,
    score: float,
    category: str
) -> str:
    """
    Генерирует объяснение оценки
    
    Args:
        skills_data: Данные о навыках
        experience_data: Данные об опыте
        education_data: Данные об образовании
        score: Итоговая оценка
        category: Категория
    
    Returns:
        Текстовое объяснение
    """
    parts = []
    
    # Общая оценка
    parts.append(f"Оценка: {score}/10 - {category}")
    
    # Навыки
    matched = skills_data.get("matched", 0)
    required = skills_data.get("required", 0)
    if required > 0:
        percentage = (matched / required) * 100
        parts.append(f"Навыки: {matched}/{required} ({percentage:.0f}%)")
        
        if matched == required:
            parts.append("✓ Все требуемые навыки присутствуют")
        elif matched > 0:
            missing = skills_data.get("missing", [])
            if missing:
                parts.append(f"Отсутствуют: {', '.join(missing[:3])}")
        else:
            parts.append("✗ Требуемые навыки не найдены")
    
    # Опыт
    cand_years = experience_data.get("candidate_years", 0)
    req_years = experience_data.get("required_years", 0)
    if req_years > 0:
        if cand_years >= req_years:
            parts.append(f"✓ Опыт: {cand_years} лет (требуется {req_years})")
        else:
            parts.append(f"Опыт: {cand_years} лет (требуется {req_years}) - недостаточно")
    elif cand_years > 0:
        parts.append(f"Опыт: {cand_years} лет")
    
    # Образование
    if education_data.get("match"):
        parts.append("✓ Образование соответствует")
    
    return ". ".join(parts)

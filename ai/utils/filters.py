"""
Обработка фильтров и требований
"""
from models.vacancy import FilterCriterion
from models.candidate import Candidate
from .synonyms import normalize_skill, extract_years_of_experience


def check_filter(candidate: Candidate, criterion: FilterCriterion) -> bool:
    """
    Проверяет, соответствует ли кандидат критерию
    
    Args:
        candidate: Кандидат
        criterion: Критерий фильтрации
    
    Returns:
        True если соответствует, False иначе
    """
    if criterion.type == "skill":
        return _check_skill_filter(candidate, criterion)
    elif criterion.type == "experience":
        return _check_experience_filter(candidate, criterion)
    elif criterion.type == "education":
        return _check_education_filter(candidate, criterion)
    elif criterion.type == "language":
        return _check_language_filter(candidate, criterion)
    elif criterion.type == "location":
        return _check_location_filter(candidate, criterion)
    
    return False


def _check_skill_filter(candidate: Candidate, criterion: FilterCriterion) -> bool:
    """Проверка навыка"""
    value = str(criterion.value).lower()
    candidate_skills = [normalize_skill(s) for s in candidate.skills]
    
    if criterion.operator == "contains":
        # Проверяем наличие навыка
        normalized_value = normalize_skill(value)
        return normalized_value in candidate_skills
    
    elif criterion.operator == "any_of":
        # Проверяем наличие хотя бы одного из навыков (разделенных |)
        required_skills = [normalize_skill(s.strip()) for s in value.split("|")]
        return any(skill in candidate_skills for skill in required_skills)
    
    elif criterion.operator == "=":
        # Точное совпадение
        normalized_value = normalize_skill(value)
        return normalized_value in candidate_skills
    
    return False


def _check_experience_filter(candidate: Candidate, criterion: FilterCriterion) -> bool:
    """Проверка опыта"""
    try:
        required_years = float(criterion.value)
    except (ValueError, TypeError):
        return False
    
    # Получаем опыт кандидата
    candidate_years = 0.0
    if candidate.resume and candidate.resume.experience_years:
        candidate_years = candidate.resume.experience_years
    else:
        # Пытаемся извлечь из текста
        text = candidate.to_text()
        candidate_years = extract_years_of_experience(text)
    
    # Применяем оператор
    if criterion.operator == ">":
        return candidate_years > required_years
    elif criterion.operator == "<":
        return candidate_years < required_years
    elif criterion.operator == "=":
        return abs(candidate_years - required_years) < 0.5
    elif criterion.operator == ">=":
        return candidate_years >= required_years
    elif criterion.operator == "<=":
        return candidate_years <= required_years
    
    return False


def _check_education_filter(candidate: Candidate, criterion: FilterCriterion) -> bool:
    """Проверка образования"""
    if not candidate.resume or not candidate.resume.education:
        return False
    
    value = str(criterion.value).lower()
    education = candidate.resume.education.lower()
    
    if criterion.operator == "contains":
        return value in education
    elif criterion.operator == "=":
        return value == education
    elif criterion.operator == "any_of":
        options = [s.strip() for s in value.split("|")]
        return any(opt in education for opt in options)
    
    return False


def _check_language_filter(candidate: Candidate, criterion: FilterCriterion) -> bool:
    """Проверка языка"""
    if not candidate.resume or not candidate.resume.languages:
        return False
    
    value = str(criterion.value).lower()
    languages = [lang.lower() for lang in candidate.resume.languages]
    
    if criterion.operator == "contains":
        return any(value in lang for lang in languages)
    elif criterion.operator == "any_of":
        options = [s.strip().lower() for s in value.split("|")]
        return any(opt in lang for lang in languages for opt in options)
    
    return False


def _check_location_filter(candidate: Candidate, criterion: FilterCriterion) -> bool:
    """Проверка локации (заглушка)"""
    # TODO: Добавить поддержку локации в модель кандидата
    return True


def apply_filters(candidate: Candidate, filters: list[FilterCriterion]) -> dict:
    """
    Применяет список фильтров к кандидату
    
    Args:
        candidate: Кандидат
        filters: Список критериев
    
    Returns:
        dict с результатами: passed (list), failed (list), score_modifier (float)
    """
    passed = []
    failed = []
    score_modifier = 1.0
    
    for criterion in filters:
        if check_filter(candidate, criterion):
            passed.append(criterion)
            # Бонус за соответствие (пропорционально весу)
            score_modifier += (criterion.weight * 0.05)
        else:
            failed.append(criterion)
    
    return {
        "passed": passed,
        "failed": failed,
        "score_modifier": score_modifier
    }


def calculate_filter_penalty(candidate: Candidate, dealbreakers: list[FilterCriterion]) -> float:
    """
    Рассчитывает штраф за несоответствие dealbreakers
    
    Args:
        candidate: Кандидат
        dealbreakers: Список исключающих критериев
    
    Returns:
        Множитель штрафа (0.0-1.0)
    """
    if not dealbreakers:
        return 1.0
    
    penalty = 1.0
    
    for criterion in dealbreakers:
        if not check_filter(candidate, criterion):
            # Каждый несоответствующий dealbreaker снижает оценку
            penalty *= (1.0 - (criterion.weight * 0.15))
    
    return max(0.1, penalty)  # Минимум 0.1 (не обнуляем полностью)

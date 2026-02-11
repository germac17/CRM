"""
Словари синонимов и нормализация навыков
"""

# Синонимы навыков (все в нижнем регистре)
SKILL_SYNONYMS = {
    # Языки программирования
    "python": ["python3", "python2", "питон", "пайтон"],
    "javascript": ["js", "es6", "es2015", "es2020", "ecmascript", "джаваскрипт", "javascript/typescript"],
    "typescript": ["ts", "тайпскрипт"],
    "java": ["джава"],
    "c++": ["cpp", "c plus plus", "си плюс плюс"],
    "c#": ["csharp", "c sharp", "си шарп"],
    "go": ["golang"],
    "rust": ["раст"],
    "ruby": ["руби"],
    "php": ["пхп"],
    
    # Frontend фреймворки
    "react": ["reactjs", "react.js", "реакт"],
    "vue": ["vuejs", "vue.js"],
    "angular": ["angularjs", "angular2+", "angular 2"],
    "svelte": ["свелт"],
    "next.js": ["nextjs", "next"],
    "nuxt": ["nuxtjs", "nuxt.js"],
    
    # Backend фреймворки
    "django": ["джанго"],
    "flask": ["фласк"],
    "fastapi": ["fast api"],
    "express": ["expressjs", "express.js"],
    "nest.js": ["nestjs", "nest"],
    "spring": ["spring boot", "spring framework"],
    
    # Базы данных
    "postgresql": ["postgres", "pg", "постгрес", "postgre"],
    "mysql": ["my sql"],
    "mongodb": ["mongo", "монго"],
    "redis": ["редис"],
    "elasticsearch": ["elastic", "es"],
    "cassandra": ["кассандра"],
    
    # DevOps & Cloud
    "docker": ["докер"],
    "kubernetes": ["k8s", "кубер", "кубернетес"],
    "ci/cd": ["cicd", "continuous integration", "ci cd"],
    "jenkins": ["дженкинс"],
    "gitlab": ["gitlab ci", "gitlab ci/cd"],
    "github actions": ["github action", "gh actions"],
    "terraform": ["терраформ"],
    "ansible": ["ансибл"],
    "aws": ["amazon web services", "amazon aws"],
    "azure": ["microsoft azure"],
    "gcp": ["google cloud", "google cloud platform"],
    
    # Тестирование
    "pytest": ["py.test"],
    "jest": ["джест"],
    "selenium": ["селениум"],
    "cypress": ["сайпресс"],
    "junit": ["j unit"],
    
    # Методологии
    "agile": ["аджайл", "scrum", "kanban"],
    "scrum": ["скрам"],
    "kanban": ["канбан"],
    "devops": ["dev ops"],
    
    # Аналитика и Data
    "sql": ["structured query language", "скл"],
    "nosql": ["no sql"],
    "data analysis": ["анализ данных", "data analytics"],
    "machine learning": ["ml", "машинное обучение"],
    "deep learning": ["dl", "глубокое обучение"],
    "pandas": ["пандас"],
    "numpy": ["нампай"],
    "tensorflow": ["tensor flow"],
    "pytorch": ["py torch"],
    
    # Маркетинг
    "seo": ["search engine optimization", "поисковая оптимизация"],
    "smm": ["social media marketing", "социальные сети"],
    "google analytics": ["ga", "гугл аналитика"],
    "google ads": ["google adwords", "гугл адс"],
    "яндекс.директ": ["yandex direct", "директ"],
    
    # Soft skills
    "teamwork": ["командная работа", "работа в команде", "team work"],
    "leadership": ["лидерство", "руководство"],
    "communication": ["коммуникация", "общение", "коммуникабельность"],
    "problem solving": ["решение проблем", "problem-solving"],
    "critical thinking": ["критическое мышление"],
    "time management": ["управление временем", "тайм-менеджмент"],
    
    # CRM и инструменты
    "bitrix24": ["битрикс", "битрикс 24"],
    "amocrm": ["amo crm", "амо срм"],
    "salesforce": ["сейлсфорс"],
    "hubspot": ["хабспот"],
    
    # Дизайн
    "figma": ["фигма"],
    "photoshop": ["фотошоп", "ps"],
    "illustrator": ["иллюстратор", "ai"],
    "sketch": ["скетч"],
    "adobe xd": ["xd"],
}

# Уровни опыта
EXPERIENCE_LEVELS = {
    "junior": {
        "years": (0, 2),
        "keywords": ["junior", "джуниор", "начинающий", "intern", "интерн", "стажер"]
    },
    "middle": {
        "years": (2, 5),
        "keywords": ["middle", "миддл", "опытный", "experienced"]
    },
    "senior": {
        "years": (5, 100),
        "keywords": ["senior", "сеньор", "ведущий", "старший", "lead", "лид", "principal"]
    }
}

# Уровни образования
EDUCATION_LEVELS = {
    "высшее": ["высшее", "университет", "институт", "вуз", "бакалавр", "магистр", "специалист"],
    "среднее специальное": ["колледж", "техникум", "среднее специальное"],
    "курсы": ["курсы", "bootcamp", "буткемп", "онлайн курс", "сертификат"]
}


def normalize_skill(skill: str) -> str:
    """
    Нормализация навыка с учетом синонимов
    
    Args:
        skill: Навык для нормализации
    
    Returns:
        Нормализованный навык
    
    Examples:
        >>> normalize_skill("Python3")
        'python'
        >>> normalize_skill("ReactJS")
        'react'
        >>> normalize_skill("K8s")
        'kubernetes'
    """
    skill_lower = skill.lower().strip()
    
    # Проверяем, является ли сам навык базовым
    if skill_lower in SKILL_SYNONYMS:
        return skill_lower
    
    # Ищем среди синонимов
    for base_skill, synonyms in SKILL_SYNONYMS.items():
        if skill_lower in synonyms:
            return base_skill
    
    # Если не найден - возвращаем как есть
    return skill_lower


def find_skill_matches(candidate_skills: list[str], required_skills: list[str]) -> dict:
    """
    Находит совпадения навыков с учетом синонимов
    
    Args:
        candidate_skills: Навыки кандидата
        required_skills: Требуемые навыки
    
    Returns:
        dict с matched (list), missing (list), extra (list)
    """
    # Нормализуем навыки
    normalized_candidate = {normalize_skill(s): s for s in candidate_skills}
    normalized_required = {normalize_skill(s): s for s in required_skills}
    
    # Находим совпадения
    matched_keys = set(normalized_candidate.keys()) & set(normalized_required.keys())
    matched = [normalized_required[k] for k in matched_keys]
    
    # Находим недостающие
    missing_keys = set(normalized_required.keys()) - set(normalized_candidate.keys())
    missing = [normalized_required[k] for k in missing_keys]
    
    # Находим дополнительные
    extra_keys = set(normalized_candidate.keys()) - set(normalized_required.keys())
    extra = [normalized_candidate[k] for k in extra_keys]
    
    return {
        "matched": matched,
        "missing": missing,
        "extra": extra
    }


def extract_experience_level(text: str) -> str | None:
    """
    Извлекает уровень опыта из текста
    
    Args:
        text: Текст для анализа
    
    Returns:
        "junior", "middle", "senior" или None
    """
    text_lower = text.lower()
    
    for level, data in EXPERIENCE_LEVELS.items():
        for keyword in data["keywords"]:
            if keyword in text_lower:
                return level
    
    return None


def extract_years_of_experience(text: str) -> float:
    """
    Извлекает количество лет опыта из текста
    
    Args:
        text: Текст для анализа
    
    Returns:
        Количество лет (float)
    
    Examples:
        >>> extract_years_of_experience("5 лет опыта в Python")
        5.0
        >>> extract_years_of_experience("Опыт работы: 3.5 года")
        3.5
    """
    import re
    
    # Паттерны для поиска
    patterns = [
        r'(\d+\.?\d*)\s*(?:лет|года|год)',
        r'(?:опыт|experience)[:.\s]+(\d+\.?\d*)',
        r'(\d+\.?\d*)\s*years?',
        r'(\d+)\+\s*(?:лет|года|год)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text.lower())
        if match:
            try:
                return float(match.group(1))
            except (ValueError, IndexError):
                continue
    
    return 0.0

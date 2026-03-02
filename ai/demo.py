"""
Демонстрация работы системы ИИ-матчинга
"""
from models import Candidate, Vacancy, VacancyRequirements, FilterCriterion, CandidateResume
from services import MatcherService


def create_demo_vacancy() -> Vacancy:
    """Создание демо-вакансии"""
    requirements = VacancyRequirements(
        must_have=[
            FilterCriterion(
                type="skill",
                value="Python",
                weight=5,
                operator="contains"
            ),
            FilterCriterion(
                type="skill",
                value="Django|Flask|FastAPI",
                weight=4,
                operator="any_of"
            ),
            FilterCriterion(
                type="experience",
                value=3,
                weight=4,
                operator=">"
            ),
        ],
        nice_to_have=[
            FilterCriterion(
                type="skill",
                value="Docker",
                weight=2,
                operator="contains"
            ),
            FilterCriterion(
                type="skill",
                value="PostgreSQL",
                weight=3,
                operator="contains"
            ),
            FilterCriterion(
                type="skill",
                value="Redis",
                weight=2,
                operator="contains"
            ),
        ],
        dealbreakers=[
            FilterCriterion(
                type="experience",
                value=1,
                weight=5,
                operator="<"
            ),
        ]
    )
    
    return Vacancy(
        id="vac-demo-001",
        title="Senior Python Developer",
        department="Backend",
        location="Москва / Remote",
        status="open",
        description="Ищем опытного Python разработчика для работы над высоконагруженными системами. "
                   "Требуется опыт работы с Django или FastAPI, знание PostgreSQL и Docker. "
                   "Работа в agile команде, участие в архитектурных решениях.",
        requirements=requirements
    )


def create_demo_candidates() -> list[Candidate]:
    """Создание демо-кандидатов"""
    
    # Кандидат 1: Идеальный
    candidate1 = Candidate(
        id="cand-demo-001",
        name="Иван Петров",
        role="Senior Python Developer",
        skills=["Python", "Django", "PostgreSQL", "Docker", "Redis", "Git"],
        resume=CandidateResume(
            skills=["Python", "Django", "PostgreSQL", "Docker", "Redis", "Git", "Linux"],
            experience_years=5.0,
            education="Высшее техническое, МГТУ им. Баумана",
            achievements=[
                "Оптимизировал производительность API на 40%",
                "Внедрил микросервисную архитектуру",
                "Руководил командой из 3 разработчиков"
            ],
            languages=["Русский", "Английский (B2)"],
            raw_text="5 лет опыта разработки на Python. Работал с Django, FastAPI, PostgreSQL. "
                    "Опыт работы с высоконагруженными системами, микросервисами. "
                    "Знание Docker, Kubernetes, CI/CD. Участвовал в архитектурных решениях."
        )
    )
    
    # Кандидат 2: Средний
    candidate2 = Candidate(
        id="cand-demo-002",
        name="Мария Иванова",
        role="Python Developer",
        skills=["Python", "Flask", "MySQL"],
        resume=CandidateResume(
            skills=["Python", "Flask", "MySQL", "HTML", "CSS"],
            experience_years=2.5,
            education="Высшее, СПбГУ, факультет математики",
            achievements=[
                "Разработала REST API для CRM системы"
            ],
            languages=["Русский", "Английский (B1)"],
            raw_text="2.5 года опыта разработки на Python. Работала с Flask, MySQL. "
                    "Опыт создания REST API, работы с базами данных."
        )
    )
    
    # Кандидат 3: Неподходящий
    candidate3 = Candidate(
        id="cand-demo-003",
        name="Петр Сидоров",
        role="Java Developer",
        skills=["Java", "Spring Boot", "Oracle"],
        resume=CandidateResume(
            skills=["Java", "Spring", "Spring Boot", "Oracle", "SQL"],
            experience_years=4.0,
            education="Высшее техническое",
            achievements=[
                "Разработал микросервисы на Spring Boot"
            ],
            languages=["Русский"],
            raw_text="4 года опыта разработки на Java. Работал с Spring Boot, Oracle. "
                    "Опыт создания микросервисной архитектуры."
        )
    )
    
    # Кандидат 4: Junior
    candidate4 = Candidate(
        id="cand-demo-004",
        name="Анна Смирнова",
        role="Junior Python Developer",
        skills=["Python", "Django"],
        resume=CandidateResume(
            skills=["Python", "Django", "SQLite", "Git"],
            experience_years=0.5,
            education="Студентка 4 курса, МГУ",
            achievements=[
                "Прошла курс по Python и Django"
            ],
            languages=["Русский", "Английский (A2)"],
            raw_text="6 месяцев опыта разработки на Python. Изучаю Django, создала несколько pet-проектов. "
                    "Активно учусь, хочу развиваться как backend разработчик."
        )
    )
    
    # Кандидат 5: Переквалификация
    candidate5 = Candidate(
        id="cand-demo-005",
        name="Алексей Козлов",
        role="Python Developer",
        skills=["Python", "FastAPI", "PostgreSQL", "Docker", "Kubernetes"],
        resume=CandidateResume(
            skills=["Python", "FastAPI", "PostgreSQL", "Docker", "Kubernetes", "AWS"],
            experience_years=3.5,
            education="Высшее техническое, курсы по Python",
            achievements=[
                "Мигрировал legacy систему на микросервисы",
                "Настроил CI/CD пайплайн"
            ],
            languages=["Русский", "Английский (C1)"],
            raw_text="3.5 года опыта разработки на Python. Работал с FastAPI, PostgreSQL, Docker, Kubernetes. "
                    "Опыт миграции монолитов на микросервисы. Знание AWS, CI/CD. "
                    "До этого 2 года работал frontend разработчиком."
        )
    )
    
    return [candidate1, candidate2, candidate3, candidate4, candidate5]


def print_separator(title: str = ""):
    """Печать разделителя"""
    if title:
        print(f"\n{'='*70}")
        print(f"  {title}")
        print('='*70)
    else:
        print('-'*70)


def print_match_result(match, candidate_name: str):
    """Вывод результата матчинга"""
    print(f"\n[{match.category}] {candidate_name}")
    print(f"   Оценка: {match.score}/10")
    print(f"   Категория: {match.category}")
    print(f"   Уверенность модели: {match.confidence*100:.0f}%")
    if match.needs_review:
        print(f"   Требует проверки HR")
    
    print(f"\n   Детали:")
    print(f"      • Навыки: {match.details.skills_match.get('matched', 0)}/{match.details.skills_match.get('required', 0)}")
    print(f"      • Семантическое сходство: {match.details.semantic_similarity*100:.0f}%")
    print(f"      • Соответствие опыта: {match.details.experience_match*100:.0f}%")
    print(f"      • Образование: {'Да' if match.details.education_match else 'Нет'}")
    
    print(f"\n   Объяснение:")
    print(f"      {match.explanation}")
    
    print_separator()


def main():
    """Основная функция демонстрации"""
    print("""
    ╔══════════════════════════════════════════════════════════════╗
    ║       ДЕМОНСТРАЦИЯ СИСТЕМЫ ИИ-МАТЧИНГА ДЛЯ HR CRM          ║
    ╚══════════════════════════════════════════════════════════════╝
    """)
    
    # Инициализация сервиса
    print("Инициализация AI-сервиса...")
    matcher = MatcherService()
    print("Сервис инициализирован\n")
    
    # Создание демо-данных
    vacancy = create_demo_vacancy()
    candidates = create_demo_candidates()
    
    # Вывод информации о вакансии
    print_separator("ВАКАНСИЯ")
    print(f"Должность: {vacancy.title}")
    print(f"Отдел: {vacancy.department}")
    print(f"Локация: {vacancy.location}")
    print(f"\nОписание:\n{vacancy.description}")
    
    if vacancy.requirements:
        print(f"\nОбязательные требования:")
        for req in vacancy.requirements.must_have:
            print(f"   • {req.type}: {req.value} (вес: {req.weight}/5)")
        
        print(f"\nЖелательные навыки:")
        for req in vacancy.requirements.nice_to_have:
            print(f"   • {req.type}: {req.value} (вес: {req.weight}/5)")
    
    # Матчинг всех кандидатов
    print_separator("АНАЛИЗ КАНДИДАТОВ")
    print(f"\nАнализируем {len(candidates)} кандидатов...")
    
    matches = matcher.match_batch(vacancy, candidates)
    
    print(f"Анализ завершен\n")
    
    # Вывод результатов
    print_separator("РЕЗУЛЬТАТЫ МАТЧИНГА")
    
    for i, match in enumerate(matches, 1):
        candidate = next(c for c in candidates if c.id == match.candidate_id)
        print(f"\n#{i}. ", end="")
        print_match_result(match, candidate.name)
    
    # Сводка
    summary = matcher.calculate_summary(matches)
    
    print_separator("СВОДКА")
    print(f"\nВсего кандидатов проанализировано: {summary['total']}")
    print(f"\n   Подходящие (7+ баллов): {summary['suitable']}")
    print(f"   Условно подходящие (4-6 баллов): {summary['conditional']}")
    print(f"   Не подходящие (1-3 балла): {summary['unsuitable']}")
    print(f"\n   Средняя оценка: {summary['average_score']}/10")
    print(f"   Требуют проверки HR: {summary['needs_review_count']}")
    
    if summary.get('top_candidate'):
        print(f"\n   Лучший кандидат:")
        print(f"      ID: {summary['top_candidate']['id']}")
        print(f"      Оценка: {summary['top_candidate']['score']}/10")
        print(f"      Категория: {summary['top_candidate']['category']}")
    
    # Рекомендации
    print_separator("РЕКОМЕНДАЦИИ")
    
    suitable = matcher.filter_by_category(matches, "Подходящие")
    if suitable:
        print(f"\nРекомендуем пригласить на собеседование:")
        for match in suitable[:3]:
            candidate = next(c for c in candidates if c.id == match.candidate_id)
            print(f"   • {candidate.name} (оценка: {match.score}/10)")
    else:
        print(f"\nИдеальных кандидатов не найдено.")
        print(f"   Рассмотрите кандидатов из категории 'Условно подходящие'")
    
    print_separator()
    print("\nДемонстрация завершена.\n")


if __name__ == "__main__":
    main()

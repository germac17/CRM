"""
Скрипт для создания тестовых данных
"""
import json
from pathlib import Path


def create_test_data():
    """Создание тестовых вакансий и кандидатов"""
    
    data_dir = Path("../backend/data")
    data_dir.mkdir(exist_ok=True)
    
    print("Создание тестовых данных...")
    
    # Тестовые вакансии
    vacancies = [
        {
            "id": "vac-test-001",
            "title": "Senior Python Developer",
            "department": "Backend",
            "location": "Москва / Remote",
            "status": "open",
            "description": "Ищем опытного Python разработчика",
            "requirements": {
                "must_have": [
                    {"type": "skill", "value": "Python", "weight": 5, "operator": "contains"},
                    {"type": "skill", "value": "Django|Flask|FastAPI", "weight": 4, "operator": "any_of"},
                    {"type": "experience", "value": 3, "weight": 4, "operator": ">"}
                ],
                "nice_to_have": [
                    {"type": "skill", "value": "Docker", "weight": 2, "operator": "contains"},
                    {"type": "skill", "value": "PostgreSQL", "weight": 3, "operator": "contains"}
                ]
            }
        },
        {
            "id": "vac-test-002",
            "title": "Frontend Developer (React)",
            "department": "Frontend",
            "location": "Санкт-Петербург",
            "status": "open",
            "description": "Разработка современных веб-интерфейсов",
            "requirements": {
                "must_have": [
                    {"type": "skill", "value": "React", "weight": 5, "operator": "contains"},
                    {"type": "skill", "value": "TypeScript|JavaScript", "weight": 4, "operator": "any_of"},
                    {"type": "experience", "value": 2, "weight": 3, "operator": ">"}
                ],
                "nice_to_have": [
                    {"type": "skill", "value": "Redux", "weight": 2, "operator": "contains"},
                    {"type": "skill", "value": "CSS", "weight": 2, "operator": "contains"}
                ]
            }
        },
        {
            "id": "vac-test-003",
            "title": "DevOps Engineer",
            "department": "Infrastructure",
            "location": "Remote",
            "status": "open",
            "description": "Автоматизация и управление инфраструктурой",
            "requirements": {
                "must_have": [
                    {"type": "skill", "value": "Docker", "weight": 5, "operator": "contains"},
                    {"type": "skill", "value": "Kubernetes", "weight": 4, "operator": "contains"},
                    {"type": "experience", "value": 2, "weight": 4, "operator": ">"}
                ],
                "nice_to_have": [
                    {"type": "skill", "value": "AWS", "weight": 3, "operator": "contains"},
                    {"type": "skill", "value": "Terraform", "weight": 2, "operator": "contains"}
                ]
            }
        }
    ]
    
    # Тестовые кандидаты
    candidates = [
        {
            "id": "cand-test-001",
            "name": "Иван Петров",
            "role": "Senior Python Developer",
            "skills": ["Python", "Django", "PostgreSQL", "Docker", "Redis"],
            "stage": "Скрининг",
            "resume": {
                "skills": ["Python", "Django", "PostgreSQL", "Docker", "Redis", "Git"],
                "experience_years": 5.0,
                "education": "Высшее техническое, МГТУ им. Баумана",
                "achievements": ["Оптимизировал API на 40%", "Внедрил микросервисы"],
                "languages": ["Русский", "Английский (B2)"],
                "raw_text": "5 лет опыта разработки на Python. Django, PostgreSQL, Docker."
            }
        },
        {
            "id": "cand-test-002",
            "name": "Мария Иванова",
            "role": "Frontend Developer",
            "skills": ["React", "TypeScript", "Redux", "CSS"],
            "stage": "Скрининг",
            "resume": {
                "skills": ["React", "TypeScript", "Redux", "CSS", "HTML"],
                "experience_years": 3.0,
                "education": "Высшее, СПбГУ",
                "achievements": ["Разработала SPA для крупного клиента"],
                "languages": ["Русский", "Английский (B1)"],
                "raw_text": "3 года опыта React разработки. TypeScript, Redux, CSS."
            }
        },
        {
            "id": "cand-test-003",
            "name": "Алексей Сидоров",
            "role": "DevOps Engineer",
            "skills": ["Docker", "Kubernetes", "AWS", "Terraform", "Python"],
            "stage": "Скрининг",
            "resume": {
                "skills": ["Docker", "Kubernetes", "AWS", "Terraform", "Python", "Ansible"],
                "experience_years": 4.0,
                "education": "Высшее техническое",
                "achievements": ["Настроил CI/CD для 20+ проектов"],
                "languages": ["Русский", "Английский (C1)"],
                "raw_text": "4 года опыта DevOps. Docker, Kubernetes, AWS, Terraform."
            }
        },
        {
            "id": "cand-test-004",
            "name": "Елена Смирнова",
            "role": "Python Developer",
            "skills": ["Python", "Flask", "MySQL"],
            "stage": "Скрининг",
            "resume": {
                "skills": ["Python", "Flask", "MySQL", "HTML"],
                "experience_years": 2.0,
                "education": "Высшее",
                "achievements": ["Разработала REST API"],
                "languages": ["Русский"],
                "raw_text": "2 года опыта Python. Flask, MySQL."
            }
        },
        {
            "id": "cand-test-005",
            "name": "Дмитрий Козлов",
            "role": "Full Stack Developer",
            "skills": ["JavaScript", "Node.js", "React", "MongoDB"],
            "stage": "Скрининг",
            "resume": {
                "skills": ["JavaScript", "Node.js", "React", "MongoDB", "Express"],
                "experience_years": 3.5,
                "education": "Высшее техническое",
                "achievements": ["Разработал e-commerce платформу"],
                "languages": ["Русский", "Английский (B2)"],
                "raw_text": "3.5 года Full Stack разработки. Node.js, React, MongoDB."
            }
        }
    ]
    
    # Сохранение данных
    vacancies_file = data_dir / "user-usr-admin-vacancies.json"
    candidates_file = data_dir / "user-usr-admin-candidates.json"
    
    with open(vacancies_file, "w", encoding="utf-8") as f:
        json.dump(vacancies, f, ensure_ascii=False, indent=2)
    
    with open(candidates_file, "w", encoding="utf-8") as f:
        json.dump(candidates, f, ensure_ascii=False, indent=2)
    
    print(f"Создано {len(vacancies)} вакансий")
    print(f"Создано {len(candidates)} кандидатов")
    print(f"\nФайлы сохранены в: {data_dir.absolute()}")
    print(f"   - {vacancies_file.name}")
    print(f"   - {candidates_file.name}")
    
    print("\nТестовые данные готовы.")
    print("\nТеперь вы можете:")
    print("1. Запустить AI-сервис: python app.py")
    print("2. Протестировать API: python test_api.py")
    print("3. Запустить матчинг через API:")
    print('   curl -X POST "http://localhost:8001/api/match/batch" \\')
    print('     -H "Content-Type: application/json" \\')
    print('     -d \'{"vacancy_id": "vac-test-001", "auto_save": true}\'')


if __name__ == "__main__":
    create_test_data()

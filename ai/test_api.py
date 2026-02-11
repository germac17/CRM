"""
Скрипт для тестирования API AI-сервиса
"""
import requests
import json
from time import sleep


API_URL = "http://localhost:8001"


def print_section(title: str):
    """Печать секции"""
    print(f"\n{'='*70}")
    print(f"  {title}")
    print('='*70)


def test_health():
    """Тест health endpoint"""
    print_section("1. ПРОВЕРКА ЗДОРОВЬЯ СЕРВИСА")
    
    try:
        response = requests.get(f"{API_URL}/health", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Сервис работает: {data}")
            return True
        else:
            print(f"✗ Ошибка: статус {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"✗ Не удалось подключиться к {API_URL}")
        print("  Убедитесь, что сервис запущен: python app.py")
        return False
    except Exception as e:
        print(f"✗ Ошибка: {e}")
        return False


def test_parse_resume():
    """Тест парсинга резюме"""
    print_section("2. ПАРСИНГ РЕЗЮМЕ")
    
    resume_text = """
    Иван Петров
    Senior Python Developer
    
    Опыт работы: 5 лет
    
    Навыки:
    - Python, Django, FastAPI
    - PostgreSQL, Redis
    - Docker, Kubernetes
    - Git, CI/CD
    
    Образование:
    Высшее техническое, МГТУ им. Баумана
    
    Достижения:
    - Оптимизировал производительность API на 40%
    - Внедрил микросервисную архитектуру
    
    Языки: Русский, Английский (B2)
    """
    
    try:
        response = requests.post(
            f"{API_URL}/api/parse/resume",
            json={
                "text": resume_text,
                "format": "text"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Резюме распарсено успешно:")
            print(f"  • Навыки: {len(data.get('skills', []))} найдено")
            print(f"  • Опыт: {data.get('experience_years', 0)} лет")
            print(f"  • Образование: {data.get('education', 'N/A')}")
            print(f"  • Языки: {', '.join(data.get('languages', []))}")
            return True
        else:
            print(f"✗ Ошибка: {response.status_code}")
            print(f"  {response.text}")
            return False
    except Exception as e:
        print(f"✗ Ошибка: {e}")
        return False


def test_matching():
    """Тест матчинга (требует наличия данных)"""
    print_section("3. ТЕСТ МАТЧИНГА")
    
    print("\n⚠️  Этот тест требует наличия данных в backend/data/")
    print("   Убедитесь, что есть файлы:")
    print("   - user-usr-admin-vacancies.json")
    print("   - user-usr-admin-candidates.json")
    
    # Пытаемся получить статистику
    try:
        response = requests.get(f"{API_URL}/api/stats", timeout=5)
        
        if response.status_code == 200:
            stats = response.json()
            print(f"\n📊 Статистика:")
            print(f"  • Кандидатов: {stats.get('candidates_count', 0)}")
            print(f"  • Вакансий: {stats.get('vacancies_count', 0)}")
            print(f"  • Матчей: {stats.get('matches_count', 0)}")
            
            if stats.get('candidates_count', 0) > 0 and stats.get('vacancies_count', 0) > 0:
                print("\n✓ Данные найдены, можно тестировать матчинг")
                return True
            else:
                print("\n⚠️  Недостаточно данных для тестирования матчинга")
                print("   Добавьте вакансии и кандидатов через frontend или backend API")
                return False
        else:
            print(f"✗ Ошибка получения статистики: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Ошибка: {e}")
        return False


def test_documentation():
    """Проверка доступности документации"""
    print_section("4. ПРОВЕРКА ДОКУМЕНТАЦИИ")
    
    try:
        response = requests.get(f"{API_URL}/docs", timeout=5)
        
        if response.status_code == 200:
            print(f"✓ Документация доступна: {API_URL}/docs")
            print(f"  Откройте в браузере для просмотра всех endpoints")
            return True
        else:
            print(f"✗ Документация недоступна: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Ошибка: {e}")
        return False


def main():
    """Основная функция тестирования"""
    print("""
    ╔══════════════════════════════════════════════════════════════╗
    ║              ТЕСТИРОВАНИЕ API AI-СЕРВИСА                    ║
    ╚══════════════════════════════════════════════════════════════╝
    """)
    
    results = []
    
    # Запускаем тесты
    results.append(("Health Check", test_health()))
    sleep(0.5)
    
    results.append(("Парсинг резюме", test_parse_resume()))
    sleep(0.5)
    
    results.append(("Данные для матчинга", test_matching()))
    sleep(0.5)
    
    results.append(("Документация", test_documentation()))
    
    # Итоги
    print_section("ИТОГИ ТЕСТИРОВАНИЯ")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    print()
    for test_name, result in results:
        status = "✓ PASSED" if result else "✗ FAILED"
        print(f"  {status:12} {test_name}")
    
    print(f"\n  Пройдено: {passed}/{total}")
    
    if passed == total:
        print("\n  ✅ Все тесты пройдены успешно!")
        print(f"\n  🚀 Сервис готов к работе: {API_URL}")
        print(f"  📚 Документация: {API_URL}/docs")
    else:
        print("\n  ⚠️  Некоторые тесты не прошли")
        print("     Проверьте вывод выше для деталей")
    
    print()


if __name__ == "__main__":
    main()

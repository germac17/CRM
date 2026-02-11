"""
Скрипт для первоначальной настройки AI-сервиса
"""
import subprocess
import sys
from pathlib import Path


def print_step(step: str, description: str):
    """Печать шага установки"""
    print(f"\n{'='*70}")
    print(f"  ШАГ {step}: {description}")
    print('='*70)


def run_command(command: list[str], description: str):
    """Выполнение команды"""
    print(f"\n▶️  {description}...")
    try:
        result = subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True
        )
        print(f"✓ {description} завершено")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Ошибка: {e}")
        print(f"Output: {e.output}")
        return False


def check_python_version():
    """Проверка версии Python"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 9):
        print(f"✗ Требуется Python 3.9+, установлена версия {version.major}.{version.minor}")
        return False
    
    print(f"✓ Python версия {version.major}.{version.minor}.{version.micro}")
    return True


def main():
    """Основная функция установки"""
    print("""
    ╔══════════════════════════════════════════════════════════════╗
    ║           УСТАНОВКА AI-СЕРВИСА ДЛЯ HR CRM                   ║
    ╚══════════════════════════════════════════════════════════════╝
    """)
    
    # Проверка Python
    print_step("1", "Проверка версии Python")
    if not check_python_version():
        sys.exit(1)
    
    # Проверка виртуального окружения
    print_step("2", "Проверка виртуального окружения")
    venv_path = Path(".venv")
    
    if not venv_path.exists():
        print("⚠️  Виртуальное окружение не найдено")
        create = input("Создать виртуальное окружение? (y/n): ")
        
        if create.lower() == 'y':
            if not run_command(
                [sys.executable, "-m", "venv", ".venv"],
                "Создание виртуального окружения"
            ):
                sys.exit(1)
        else:
            print("⚠️  Пропуск создания виртуального окружения")
    else:
        print("✓ Виртуальное окружение найдено")
    
    # Определение пути к pip
    if sys.platform == "win32":
        pip_path = str(venv_path / "Scripts" / "pip.exe")
        python_path = str(venv_path / "Scripts" / "python.exe")
    else:
        pip_path = str(venv_path / "bin" / "pip")
        python_path = str(venv_path / "bin" / "python")
    
    # Установка зависимостей
    print_step("3", "Установка зависимостей Python")
    
    if not Path(pip_path).exists():
        print("⚠️  Используем системный pip")
        pip_path = "pip"
        python_path = sys.executable
    
    if not run_command(
        [pip_path, "install", "--upgrade", "pip"],
        "Обновление pip"
    ):
        print("⚠️  Не удалось обновить pip, продолжаем...")
    
    if not run_command(
        [pip_path, "install", "-r", "requirements.txt"],
        "Установка пакетов из requirements.txt"
    ):
        print("✗ Не удалось установить зависимости")
        sys.exit(1)
    
    # Загрузка spaCy модели
    print_step("4", "Загрузка модели spaCy")
    
    if not run_command(
        [python_path, "-m", "spacy", "download", "ru_core_news_md"],
        "Загрузка русской модели spaCy"
    ):
        print("⚠️  Не удалось загрузить модель spaCy")
        print("   Вы можете попробовать позже командой:")
        print(f"   {python_path} -m spacy download ru_core_news_md")
    
    # Проверка установки
    print_step("5", "Проверка установки")
    
    print("\n🔍 Проверка импорта модулей...")
    
    test_imports = [
        "fastapi",
        "uvicorn",
        "pydantic",
        "sklearn",
        "numpy",
    ]
    
    all_ok = True
    for module in test_imports:
        try:
            result = subprocess.run(
                [python_path, "-c", f"import {module}"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                print(f"   ✓ {module}")
            else:
                print(f"   ✗ {module} - не установлен")
                all_ok = False
        except Exception as e:
            print(f"   ✗ {module} - ошибка: {e}")
            all_ok = False
    
    # Проверка spaCy
    try:
        result = subprocess.run(
            [python_path, "-c", "import spacy; spacy.load('ru_core_news_md')"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            print(f"   ✓ spaCy модель")
        else:
            print(f"   ⚠️  spaCy модель - не загружена (работа возможна в ограниченном режиме)")
    except Exception:
        print(f"   ⚠️  spaCy модель - проверка не удалась")
    
    # Финал
    print_step("6", "Установка завершена")
    
    if all_ok:
        print("""
        ✅ Все компоненты установлены успешно!
        
        Следующие шаги:
        
        1. Активируйте виртуальное окружение:
           Windows: .venv\\Scripts\\activate
           Linux/Mac: source .venv/bin/activate
        
        2. Запустите AI-сервис:
           uvicorn app:app --reload --port 8001
           
           или
           
           python app.py
        
        3. Откройте документацию API:
           http://localhost:8001/docs
        
        4. Запустите демонстрацию:
           python demo.py
        
        Документация: README.md
        """)
    else:
        print("""
        ⚠️  Установка завершена с предупреждениями.
        
        Некоторые модули не установлены. Проверьте вывод выше
        и установите недостающие зависимости вручную.
        """)


if __name__ == "__main__":
    main()

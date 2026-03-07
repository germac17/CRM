"""
AI-сервис для HR CRM: матчинг кандидатов и вакансий
"""
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
from pathlib import Path
from typing import Optional

import config
from models import (
    Candidate,
    Vacancy,
    Match,
    MatchRequest,
    BatchMatchRequest,
    BatchMatchWithDataRequest,
    MatchWithDataRequest,
    MatchResponse,
    CandidateResume,
)
from services import MatcherService, ParserService


# Инициализация FastAPI
app = FastAPI(
    title="HR CRM AI Service",
    description="Интеллектуальная система матчинга кандидатов и вакансий",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В production ограничить конкретными доменами
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Инициализация сервисов
matcher_service = MatcherService()
parser_service = ParserService()


# ============================================================================
# Вспомогательные функции для работы с данными
# ============================================================================

def load_json_file(file_path: Path) -> list:
    """Загрузка данных из JSON файла"""
    try:
        if file_path.exists():
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return []
    except Exception as e:
        print(f"Ошибка загрузки {file_path}: {e}")
        return []


def save_json_file(file_path: Path, data: list):
    """Сохранение данных в JSON файл"""
    try:
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Ошибка сохранения {file_path}: {e}")


def get_user_file(user_id: str, data_type: str) -> Path:
    """Получить путь к файлу данных пользователя"""
    return config.DATA_DIR / f"user-{user_id}-{data_type}.json"


def load_vacancy(vacancy_id: str, user_id: str = "usr-admin") -> Optional[Vacancy]:
    """Загрузка вакансии по ID"""
    vacancies_file = get_user_file(user_id, "vacancies")
    vacancies_data = load_json_file(vacancies_file)
    
    for vac_data in vacancies_data:
        if vac_data.get("id") == vacancy_id:
            return Vacancy(**vac_data)
    
    return None


def load_candidate(candidate_id: str, user_id: str = "usr-admin") -> Optional[Candidate]:
    """Загрузка кандидата по ID"""
    candidates_file = get_user_file(user_id, "candidates")
    candidates_data = load_json_file(candidates_file)
    
    for cand_data in candidates_data:
        if cand_data.get("id") == candidate_id:
            return Candidate(**cand_data)
    
    return None


def load_all_candidates(user_id: str = "usr-admin") -> list[Candidate]:
    """Загрузка всех кандидатов"""
    candidates_file = get_user_file(user_id, "candidates")
    candidates_data = load_json_file(candidates_file)
    
    candidates = []
    for cand_data in candidates_data:
        try:
            candidates.append(Candidate(**cand_data))
        except Exception as e:
            print(f"Ошибка парсинга кандидата {cand_data.get('id')}: {e}")
    
    return candidates


def save_matches(matches: list[Match], user_id: str = "usr-admin"):
    """Сохранение результатов матчинга"""
    matches_file = get_user_file(user_id, "matches")
    
    # Загружаем существующие матчи
    existing_matches = load_json_file(matches_file)
    
    # Удаляем старые матчи для этой вакансии
    if matches:
        vacancy_id = matches[0].vacancy_id
        existing_matches = [
            m for m in existing_matches
            if m.get("vacancyId") != vacancy_id
        ]
    
    # Добавляем новые матчи
    for match in matches:
        existing_matches.append({
            "candidateId": match.candidate_id,
            "vacancyId": match.vacancy_id,
            "score": match.score,
            "explanation": match.explanation,
            "category": match.category,
            "details": match.details.model_dump() if match.details else {}
        })
    
    save_json_file(matches_file, existing_matches)


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/health")
def health_check():
    """Проверка здоровья сервиса"""
    return {
        "status": "ok",
        "service": "hr-crm-ai",
        "version": "1.0.0"
    }


@app.post("/api/match/analyze", response_model=Match)
def analyze_single_match(request: MatchRequest):
    """
    Анализ соответствия одного кандидата вакансии
    
    Args:
        request: ID вакансии и кандидата
    
    Returns:
        Результат матчинга с оценкой и объяснением
    """
    # Загружаем вакансию и кандидата
    vacancy = load_vacancy(request.vacancy_id)
    if not vacancy:
        raise HTTPException(status_code=404, detail=f"Вакансия {request.vacancy_id} не найдена")
    
    candidate = load_candidate(request.candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail=f"Кандидат {request.candidate_id} не найден")
    
    # Выполняем матчинг
    try:
        match = matcher_service.match_single(vacancy, candidate)
        return match
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка матчинга: {str(e)}")


@app.post("/api/match/batch-with-data", response_model=MatchResponse)
def analyze_batch_match_with_data(request: BatchMatchWithDataRequest):
    """
    Массовый матчинг с данными в теле запроса.
    Используется для remote-режима: backend передаёт vacancy и candidates из Supabase.
    """
    try:
        vacancy = Vacancy(**request.vacancy)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Неверный формат вакансии: {e}")
    
    candidates = []
    for c in request.candidates:
        try:
            candidates.append(Candidate(**c))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Неверный формат кандидата {c.get('id', '?')}: {e}")
    
    if not candidates:
        return MatchResponse(matches=[], summary={"total": 0})
    
    if len(candidates) > config.MAX_CANDIDATES_PER_REQUEST:
        candidates = candidates[:config.MAX_CANDIDATES_PER_REQUEST]
    
    try:
        matches = matcher_service.match_batch(vacancy, candidates)
        summary = matcher_service.calculate_summary(matches)
        return MatchResponse(matches=matches, summary=summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка матчинга: {str(e)}")


@app.post("/api/match/analyze-with-data", response_model=Match)
def analyze_single_match_with_data(request: MatchWithDataRequest):
    """
    Матчинг одного кандидата с данными в теле запроса.
    Используется для remote-режима.
    """
    try:
        vacancy = Vacancy(**request.vacancy)
        candidate = Candidate(**request.candidate)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Неверный формат данных: {e}")
    
    try:
        return matcher_service.match_single(vacancy, candidate)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка матчинга: {str(e)}")


@app.post("/api/match/batch", response_model=MatchResponse)
def analyze_batch_match(request: BatchMatchRequest):
    """
    Массовый анализ кандидатов для вакансии
    
    Args:
        request: ID вакансии и опционально список ID кандидатов
    
    Returns:
        Список результатов матчинга со сводкой
    """
    # Загружаем вакансию
    vacancy = load_vacancy(request.vacancy_id)
    if not vacancy:
        raise HTTPException(status_code=404, detail=f"Вакансия {request.vacancy_id} не найдена")
    
    # Загружаем кандидатов
    if request.candidate_ids:
        # Загружаем конкретных кандидатов
        candidates = []
        for cand_id in request.candidate_ids:
            candidate = load_candidate(cand_id)
            if candidate:
                candidates.append(candidate)
    else:
        # Загружаем всех кандидатов
        candidates = load_all_candidates()
    
    if not candidates:
        return MatchResponse(matches=[], summary={"total": 0})
    
    # Ограничиваем количество кандидатов
    if len(candidates) > config.MAX_CANDIDATES_PER_REQUEST:
        candidates = candidates[:config.MAX_CANDIDATES_PER_REQUEST]
    
    # Выполняем матчинг
    try:
        matches = matcher_service.match_batch(vacancy, candidates)
        
        # Сохраняем результаты если требуется
        if request.auto_save:
            save_matches(matches)
        
        # Рассчитываем сводку
        summary = matcher_service.calculate_summary(matches)
        
        return MatchResponse(matches=matches, summary=summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка матчинга: {str(e)}")


@app.get("/api/match/top/{vacancy_id}")
def get_top_candidates(vacancy_id: str, limit: int = 10):
    """
    Получить топ N лучших кандидатов для вакансии
    
    Args:
        vacancy_id: ID вакансии
        limit: Количество кандидатов (по умолчанию 10)
    
    Returns:
        Топ кандидатов
    """
    vacancy = load_vacancy(vacancy_id)
    if not vacancy:
        raise HTTPException(status_code=404, detail=f"Вакансия {vacancy_id} не найдена")
    
    candidates = load_all_candidates()
    if not candidates:
        return {"matches": [], "summary": {"total": 0}}
    
    try:
        top_matches = matcher_service.get_top_candidates(vacancy, candidates, limit)
        summary = matcher_service.calculate_summary(top_matches)
        
        return {
            "matches": [m.model_dump() for m in top_matches],
            "summary": summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка: {str(e)}")


class ParseRequest(BaseModel):
    """Запрос на парсинг резюме"""
    text: str
    format: str = "text"  # text, pdf, docx


@app.post("/api/parse/resume", response_model=CandidateResume)
def parse_resume(request: ParseRequest):
    """
    Парсинг резюме из текста
    
    Args:
        request: Текст резюме и формат
    
    Returns:
        Структурированное резюме
    """
    try:
        if request.format == "text":
            resume = parser_service.parse_resume_text(request.text)
        else:
            raise HTTPException(status_code=400, detail=f"Формат {request.format} не поддерживается через API")
        
        return resume
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка парсинга: {str(e)}")


@app.post("/api/parse/file")
async def parse_resume_file(file: UploadFile = File(...)):
    """
    Парсинг резюме из файла (PDF или DOCX)
    
    Args:
        file: Загруженный файл
    
    Returns:
        Структурированное резюме
    """
    # Сохраняем временный файл
    temp_path = Path(f"/tmp/{file.filename}")
    
    try:
        content = await file.read()
        temp_path.write_bytes(content)
        
        # Парсим в зависимости от типа
        if file.filename.endswith('.pdf'):
            resume = parser_service.parse_pdf(str(temp_path))
        elif file.filename.endswith('.docx'):
            resume = parser_service.parse_docx(str(temp_path))
        else:
            raise HTTPException(status_code=400, detail="Поддерживаются только PDF и DOCX")
        
        return resume.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка парсинга: {str(e)}")
    finally:
        # Удаляем временный файл
        if temp_path.exists():
            temp_path.unlink()


@app.get("/api/stats")
def get_statistics():
    """
    Получить статистику системы
    
    Returns:
        Статистика по кандидатам, вакансиям и матчам
    """
    try:
        candidates = load_all_candidates()
        vacancies_file = get_user_file("usr-admin", "vacancies")
        vacancies_data = load_json_file(vacancies_file)
        matches_file = get_user_file("usr-admin", "matches")
        matches_data = load_json_file(matches_file)
        
        return {
            "candidates_count": len(candidates),
            "vacancies_count": len(vacancies_data),
            "matches_count": len(matches_data),
            "service_status": "operational"
        }
    except Exception as e:
        return {
            "error": str(e),
            "service_status": "degraded"
        }


# ============================================================================
# Запуск приложения
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    print("""
    ╔══════════════════════════════════════════════════════════════╗
    ║          HR CRM AI Service - Система матчинга               ║
    ║                                                              ║
    ║  Документация: http://localhost:8001/docs                   ║
    ║  Health check: http://localhost:8001/health                 ║
    ╚══════════════════════════════════════════════════════════════╝
    """)
    
    uvicorn.run(
        "app:app",
        host=config.API_HOST,
        port=config.API_PORT,
        reload=True
    )

"""
Основной сервис матчинга кандидатов и вакансий
"""
from typing import List
from models.candidate import Candidate
from models.vacancy import Vacancy
from models.match import Match, MatchDetails
from services.nlp_service import NLPService
from services.vectorizer import Vectorizer
from utils.scoring import (
    calculate_skills_score,
    calculate_experience_score,
    calculate_education_score,
    calculate_final_score,
    categorize_score,
    generate_explanation
)
from utils.filters import apply_filters, calculate_filter_penalty


class MatcherService:
    """Сервис для матчинга кандидатов и вакансий"""
    
    def __init__(self):
        """Инициализация сервиса"""
        self.nlp = NLPService()
        self.vectorizer = Vectorizer()
    
    def match_single(self, vacancy: Vacancy, candidate: Candidate) -> Match:
        """
        Матчинг одного кандидата с вакансией
        
        Args:
            vacancy: Вакансия
            candidate: Кандидат
        
        Returns:
            Результат матчинга
        """
        # 1. Рассчитываем оценку навыков (40%)
        skills_data = calculate_skills_score(candidate, vacancy)
        skills_score = skills_data["score"]
        
        # 2. Семантическое сходство (30%)
        vacancy_text = vacancy.to_text()
        candidate_text = candidate.to_text()
        
        # Используем оба метода и берем среднее
        semantic_sim_tfidf = self.vectorizer.calculate_similarity(
            vacancy_text, candidate_text, method="tfidf"
        )
        semantic_sim_bert = self.vectorizer.calculate_similarity(
            vacancy_text, candidate_text, method="semantic"
        )
        
        # Взвешенная комбинация (BERT точнее, но может быть не доступен)
        if semantic_sim_bert > 0:
            semantic_similarity = 0.3 * semantic_sim_tfidf + 0.7 * semantic_sim_bert
        else:
            semantic_similarity = semantic_sim_tfidf
        
        # 3. Оценка опыта (20%)
        experience_data = calculate_experience_score(candidate, vacancy)
        experience_score = experience_data["score"]
        
        # 4. Оценка образования (10%)
        education_data = calculate_education_score(candidate, vacancy)
        education_score = education_data["score"]
        
        # 5. Бонусы за nice-to-have навыки
        nice_to_have_bonus = 0.0
        if vacancy.requirements and vacancy.requirements.nice_to_have:
            nice_results = apply_filters(candidate, vacancy.requirements.nice_to_have)
            passed_count = len(nice_results["passed"])
            nice_to_have_bonus = min(1.0, passed_count * 0.2)
        
        # 6. Штрафы за dealbreakers
        penalty_modifier = 1.0
        if vacancy.requirements and vacancy.requirements.dealbreakers:
            penalty_modifier = calculate_filter_penalty(
                candidate, vacancy.requirements.dealbreakers
            )
        
        # 7. Итоговая оценка
        final_score = calculate_final_score(
            skills_score=skills_score,
            semantic_similarity=semantic_similarity,
            experience_score=experience_score,
            education_score=education_score,
            nice_to_have_bonus=nice_to_have_bonus,
            penalty_modifier=penalty_modifier
        )
        
        # 8. Категоризация
        category = categorize_score(final_score)
        
        # 9. Генерация объяснения
        explanation = generate_explanation(
            skills_data=skills_data,
            experience_data=experience_data,
            education_data=education_data,
            score=final_score,
            category=category
        )
        
        # 10. Рассчитываем уверенность модели
        # Низкая уверенность если TF-IDF и BERT сильно расходятся
        confidence = 1.0 - abs(semantic_sim_tfidf - semantic_sim_bert)
        needs_review = confidence < 0.7 or final_score < 4.0
        
        # Создаем детали
        details = MatchDetails(
            skills_match=skills_data,
            semantic_similarity=round(semantic_similarity, 3),
            experience_match=experience_data["match_ratio"],
            education_match=education_data["match"],
            nice_to_have_bonus=round(nice_to_have_bonus, 2)
        )
        
        # Создаем результат
        match = Match(
            candidate_id=candidate.id,
            vacancy_id=vacancy.id,
            score=final_score,
            category=category,
            explanation=explanation,
            details=details,
            confidence=round(confidence, 2),
            needs_review=needs_review
        )
        
        return match
    
    def match_batch(
        self,
        vacancy: Vacancy,
        candidates: List[Candidate]
    ) -> List[Match]:
        """
        Массовый матчинг кандидатов с вакансией
        
        Args:
            vacancy: Вакансия
            candidates: Список кандидатов
        
        Returns:
            Список результатов матчинга, отсортированных по оценке
        """
        matches = []
        
        for candidate in candidates:
            try:
                match = self.match_single(vacancy, candidate)
                matches.append(match)
            except Exception as e:
                print(f"Ошибка при матчинге кандидата {candidate.id}: {e}")
                continue
        
        # Сортируем по оценке (от большего к меньшему)
        matches.sort(key=lambda m: m.score, reverse=True)
        
        return matches
    
    def get_top_candidates(
        self,
        vacancy: Vacancy,
        candidates: List[Candidate],
        limit: int = 10
    ) -> List[Match]:
        """
        Получить топ N лучших кандидатов для вакансии
        
        Args:
            vacancy: Вакансия
            candidates: Список кандидатов
            limit: Количество кандидатов
        
        Returns:
            Топ N кандидатов
        """
        matches = self.match_batch(vacancy, candidates)
        return matches[:limit]
    
    def filter_by_category(
        self,
        matches: List[Match],
        category: str
    ) -> List[Match]:
        """
        Фильтрация результатов по категории
        
        Args:
            matches: Список матчей
            category: Категория ("Подходящие", "Условно подходящие", "Не подходящие")
        
        Returns:
            Отфильтрованный список
        """
        return [m for m in matches if m.category == category]
    
    def calculate_summary(self, matches: List[Match]) -> dict:
        """
        Рассчитывает сводную статистику по матчам
        
        Args:
            matches: Список матчей
        
        Returns:
            Словарь со статистикой
        """
        if not matches:
            return {
                "total": 0,
                "suitable": 0,
                "conditional": 0,
                "unsuitable": 0,
                "average_score": 0.0,
                "needs_review_count": 0
            }
        
        suitable = self.filter_by_category(matches, "Подходящие")
        conditional = self.filter_by_category(matches, "Условно подходящие")
        unsuitable = self.filter_by_category(matches, "Не подходящие")
        
        needs_review = [m for m in matches if m.needs_review]
        
        avg_score = sum(m.score for m in matches) / len(matches)
        
        return {
            "total": len(matches),
            "suitable": len(suitable),
            "conditional": len(conditional),
            "unsuitable": len(unsuitable),
            "average_score": round(avg_score, 2),
            "needs_review_count": len(needs_review),
            "top_candidate": {
                "id": matches[0].candidate_id,
                "score": matches[0].score,
                "category": matches[0].category
            } if matches else None
        }

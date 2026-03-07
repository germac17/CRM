"""
Модели данных
"""
from .candidate import Candidate, CandidateResume
from .vacancy import Vacancy, VacancyRequirements, FilterCriterion
from .match import Match, MatchDetails, MatchRequest, BatchMatchRequest, BatchMatchWithDataRequest, MatchWithDataRequest, MatchResponse

__all__ = [
    "Candidate",
    "CandidateResume",
    "Vacancy",
    "VacancyRequirements",
    "FilterCriterion",
    "Match",
    "MatchDetails",
    "MatchRequest",
    "BatchMatchRequest",
    "BatchMatchWithDataRequest",
    "MatchWithDataRequest",
    "MatchResponse",
]

"""Quick test - prostaya demonstratsiya"""
print("=" * 70)
print("  AI MATCHING SYSTEM - QUICK TEST")
print("=" * 70)

print("\n[1/3] Loading services...")
from services import MatcherService
from models import Candidate, Vacancy, CandidateResume

print("[2/3] Creating test data...")
vacancy = Vacancy(
    id="vac-test",
    title="Python Developer",
    department="IT",
    location="Moscow",
    status="open"
)

candidate = Candidate(
    id="cand-test",
    name="Ivan Petrov",
    role="Python Developer",
    skills=["Python", "Django", "PostgreSQL"],
    resume=CandidateResume(
        skills=["Python", "Django", "PostgreSQL", "Docker"],
        experience_years=5.0,
        education="University",
        achievements=["Improved API performance by 40%"],
        languages=["Russian", "English"]
    )
)

print("[3/3] Running matching...")
matcher = MatcherService()
match = matcher.match_single(vacancy, candidate)

print("\n" + "=" * 70)
print("  RESULTS")
print("=" * 70)
print(f"\nCandidate: {candidate.name}")
print(f"Position: {vacancy.title}")
print(f"\nScore: {match.score}/10")
print(f"Category: {match.category}")
print(f"Confidence: {match.confidence * 100:.0f}%")
print(f"\nExplanation:")
print(f"  {match.explanation}")

print("\n" + "=" * 70)
print("  SUCCESS! AI Matching System is working!")
print("=" * 70)

print("\nNext steps:")
print("  1. Read START_HERE.md")
print("  2. Run: python app.py (for API server)")
print("  3. Open: http://localhost:8001/docs")
print()

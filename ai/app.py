from fastapi import FastAPI
 
app = FastAPI(title="HR CRM AI сервис")
 
@app.get("/health")
def health():
    return {"status": "ok", "service": "hr-crm-ai"}
 
@app.post("/match")
def match():
    return {
        "matches": [
            {
                "candidate_id": "cand-101",
                "score": 0.92,
                "explanation": "Сильный лидер и опыт работы с дорожными картами."
            }
        ]
    }

from fastapi import FastAPI
from datetime import datetime

app = FastAPI()

@app.get("/")
def dashboard():
    return {
        "status": "Running",
        "time": str(datetime.now()),
        "risk_levels": ["Low", "Medium", "High"]
    }

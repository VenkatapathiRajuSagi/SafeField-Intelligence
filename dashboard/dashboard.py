from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from datetime import datetime
import os
import json

# ✅ IMPORT VIDEO ROUTER
from api.video import router as video_router

app = FastAPI(title="AI Farmer Safety Dashboard")

# ------------------------------------------------
# Path setup
# ------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
STATE_FILE = os.path.join("data", "live_state.json")

# ------------------------------------------------
# Mount static files (HTML / CSS / JS)
# ------------------------------------------------
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# ------------------------------------------------
# ✅ INCLUDE VIDEO STREAM ROUTER
# ------------------------------------------------
app.include_router(video_router)

# ------------------------------------------------
# Serve dashboard UI
# ------------------------------------------------
@app.get("/")
def dashboard_ui():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

# ------------------------------------------------
# Helper: Read live state from main.py
# ------------------------------------------------
def read_live_state():
    if not os.path.exists(STATE_FILE):
        return {}
    try:
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return {}

# ------------------------------------------------
# API ENDPOINTS (LIVE DATA)
# ------------------------------------------------
@app.get("/api/status")
def status():
    state = read_live_state()
    return {
        "system": "Running",
        "last_update": state.get("timestamp", str(datetime.now()))
    }

@app.get("/api/risk")
def risk():
    state = read_live_state()
    return {
        "current": state.get("current_risk", "Unknown"),
        "future": state.get("future_risk", "Unknown"),
        "confidence": state.get("confidence", 0),
        "uncertainty": state.get("uncertainty", 1.0)
    }

@app.get("/api/counterfactual")
def counterfactual():
    state = read_live_state()
    return state.get("counterfactual", {})

@app.get("/api/spatial")
def spatial():
    state = read_live_state()
    return state.get("spatial", {})

@app.get("/api/alerts")
def alerts():
    state = read_live_state()
    return state.get("alerts", [])

# ------------------------------------------------
# 🚶 FALL DETECTION API
# ------------------------------------------------
@app.get("/api/fall")
def fall():
    state = read_live_state()
    return state.get("fall", {})

# ------------------------------------------------
# 🧍 INACTIVITY / UNCONSCIOUSNESS API
# ------------------------------------------------
@app.get("/api/inactivity")
def inactivity():
    state = read_live_state()
    return state.get("inactivity", {})

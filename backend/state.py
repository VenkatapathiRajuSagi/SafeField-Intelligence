# backend/state.py

state = {
    "snake_detected": False,
    "fall_detected": False,
    "inactivity_detected": False,
    "current_risk": 0.0,
    "future_risk": 0.0,
    "final_risk": "Low",
    "confidence": 0,
    "uncertainty": 0,
    "location": "Unknown",
    "last_alert_type": "None",
    "last_alert_time": None,
    "system_health": "Healthy",
    "active_camera": "Camera 1",
    "ai_mode": "Live"
}

import os
import datetime
import json

LOG_FILE = "alerts/alert_history.json"

def log_event(event, details="", image_path=None):
    """
    Logs a detection event to a structured JSON file.
    Automatically links the event to an optional image path.
    """
    os.makedirs("alerts", exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Simplify the event type for the dashboard (e.g., SNAKE_CONFIRMED -> Snake)
    display_type = event.replace("_CONFIRMED", "").replace("_DETECTED", "").capitalize()
    if display_type == "Alert_sent":
        return # Skip meta-alerts in the visible history

    new_entry = {
        "type": display_type,
        "time": timestamp,
        "details": details,
        "image": image_path,
        "field": "Field A"
    }

    # Load existing history
    history = []
    if os.path.exists(LOG_FILE):
        try:
            with open(LOG_FILE, "r") as f:
                history = json.load(f)
        except Exception:
            history = []

    # Append and persist
    history.append(new_entry)
    
    # Keep a rolling window of the last 100 alerts
    history = history[-100:]

    with open(LOG_FILE, "w") as f:
        json.dump(history, f, indent=2)

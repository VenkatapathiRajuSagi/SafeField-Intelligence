from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from datetime import datetime, timedelta
import time
import os
import json

# ✅ FIX: Point static folder to the project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
app = Flask(__name__, 
            static_folder=os.path.join(PROJECT_ROOT, "static"),
            static_url_path="/static")
CORS(app)

STATE_FILE = os.path.join(PROJECT_ROOT, "frontend", "public", "data", "live_state.json")

# ✅ HOME ROUTE
@app.route("/")
def home():
    return jsonify({
        "message": "Snakebite AI Backend is running"
    })

def get_past_alerts():
    log_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "alerts", "alert_history.json")
    
    if not os.path.exists(log_file):
        return []

    try:
        with open(log_file, "r") as f:
            history = json.load(f)
            # Backend returns reversed list (latest first)
            return list(reversed(history))[:5]
    except Exception:
        return []

def get_historical_stats():
    log_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "alerts", "alert_history.json")
    
    zone_stats = {}
    history = []
    
    if os.path.exists(log_file):
        try:
            with open(log_file, "r") as f:
                history = json.load(f)
                for entry in history:
                    # Zone aggregations
                    field = entry.get("field", "Field A")
                    if field not in zone_stats:
                        zone_stats[field] = {"Snake": 0, "Fall": 0, "Inactivity": 0}
                    etype = entry.get("type", "Unknown")
                    if etype in zone_stats[field]:
                        zone_stats[field][etype] += 1
        except Exception:
            pass

    # Generate a strict 14-day continuous timeline ending today
    today = datetime.now()
    continuous_days = []
    
    for i in range(13, -1, -1):
        d = today - timedelta(days=i)
        date_str = d.strftime("%Y-%m-%d")
        continuous_days.append({
            "date_str": date_str,
            "day": d.strftime("%m/%d"), 
            "Snake": 0, "Fall": 0, "Inactivity": 0
        })

    # Map history exactly into the continuous window
    for entry in history:
        entry_date_str = entry.get("time", "").split(" ")[0]
        etype = entry.get("type", "Unknown")
        # Accumulate incidents if they fall into the continuous 14-day window
        for day_obj in continuous_days:
            if day_obj["date_str"] == entry_date_str:
                if etype in day_obj:
                    day_obj[etype] += 1
                break

    # Format the return objects
    daily_data = []
    risk_trends = []
    
    for d_obj in continuous_days:
        day_label = d_obj["day"]
        
        daily_data.append({
            "day": day_label, 
            "Snake": d_obj["Snake"], 
            "Fall": d_obj["Fall"], 
            "Inactivity": d_obj["Inactivity"]
        })
        
        score = (d_obj["Snake"] * 0.5 + d_obj["Fall"] * 0.3 + d_obj["Inactivity"] * 0.1)
        risk_trends.append({"day": day_label, "Risk": min(1.0, score / 4.0)})

    zones_list = [
        {
            "name": name, 
            "Snake": stats["Snake"], 
            "Fall": stats["Fall"], 
            "Inactivity": stats["Inactivity"]
        } 
        for name, stats in zone_stats.items()
    ]

    return {"daily": daily_data, "risk": risk_trends, "zones": zones_list}

@app.route("/status")
def status():
    state = {}
    is_aged_out = False
    
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r") as f:
                state = json.load(f)
                
            # 🚀 DATA AGING CHECK (DEMO MODE: 25s)
            # We wait 25 seconds to accommodate the 20-second sticky demo window.
            if "timestamp" in state:
                data_time = datetime.fromisoformat(state["timestamp"])
                if datetime.now() - data_time > timedelta(seconds=25):
                    is_aged_out = True
        except Exception:
            pass

    # If the data is too old or the file doesn't exist, we force a "Standby" state
    if is_aged_out or not state:
        return jsonify({
            "snake_detected": False,
            "fall_detected": False,
            "inactivity": False,
            "current_risk": "Low",
            "future_risk": "Low",
            "final_risk": "Low",
            "confidence": "0",
            "uncertainty": "0",
            "counterfactual": {},
            "spatial_risk": {},
            "last_alert_type": state.get("last_alert_type", "None"),
            "last_alert_time": state.get("last_alert_time", "N/A"),
            "session_id": state.get("session_id", "none"),
            "timestamp": datetime.now().isoformat(), # Fresh timestamp to keep UI alive
            "alert_history": get_past_alerts(),
            "weekly_stats": get_historical_stats(),
            "system_mode": "STANDBY (AI ENGINE STOPPED)"
        })

    # Return live data if fresh
    return jsonify({
        "snake_detected": state.get("snake_detected", False),
        "fall_detected": state.get("fall_detected", False),
        "inactivity": state.get("inactivity", False),
        "image": state.get("image", ""),
        "history": state.get("history", []),
        "current_risk": str(state.get("current_risk", "Low")),
        "future_risk": str(state.get("future_risk", "Low")),
        "final_risk": str(state.get("final_risk", "Low")),
        "confidence": str(state.get("confidence", "0")),
        "uncertainty": str(state.get("uncertainty", "0")),
        "counterfactual": state.get("counterfactual", {}),
        "spatial_risk": state.get("spatial_risk", {}),
        "last_alert_type": state.get("last_alert_type", "None"),
        "last_alert_time": state.get("last_alert_time", "N/A"),
        "session_id": state.get("session_id", "none"),
        "timestamp": state.get("timestamp", datetime.now().isoformat()),
        "alert_history": get_past_alerts(),
        "weekly_stats": get_historical_stats(),
        "system_mode": "ACTIVE MONITORING"
    })

CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")

@app.route("/config", methods=["GET", "POST"])
def config():
    if request.method == "POST":
        try:
            new_config = request.json
            with open(CONFIG_FILE, "w") as f:
                json.dump(new_config, f, indent=2)
            return jsonify({"status": "success"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        try:
            if os.path.exists(CONFIG_FILE):
                with open(CONFIG_FILE, "r") as f:
                    return jsonify(json.load(f))
            else:
                return jsonify({
                    "snake_threshold": 40,
                    "fall_threshold": 60,
                    "snake_verify_threshold": 60,
                    "active_zone": "Field_A",
                    "modules": {"snake": True, "fall": True, "inactivity": True, "predictions": True}
                })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route("/reset", methods=["POST"])
def reset_intelligence():
    try:
        default_state = {
            "snake_detected": False,
            "fall_detected": False,
            "inactivity": False,
            "current_risk": "Low",
            "future_risk": "Low",
            "final_risk": "Low",
            "confidence": 0,
            "uncertainty": 0,
            "last_alert_type": "None",
            "last_alert_time": None,
            "image": "",
            "history": [],
            "timestamp": datetime.now().isoformat()
        }
        with open(STATE_FILE, "w") as f:
            json.dump(default_state, f, indent=2)
        return jsonify({"status": "intelligence_reset_complete"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Static images are now served automatically by Flask's static_folder config
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
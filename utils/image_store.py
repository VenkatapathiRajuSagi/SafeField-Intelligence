import os
import cv2
import time
import json

HISTORY_FILE = "backend/alert_history_db.json"
os.makedirs("static/detections", exist_ok=True)

latest_image = ""
image_history = []

# Load existing history on startup
if os.path.exists(HISTORY_FILE):
    try:
        with open(HISTORY_FILE, "r") as f:
            data = json.load(f)
            image_history = data.get("history", [])
            latest_image = data.get("latest", "")
    except:
        pass

def save_frame(frame, label="Detection"):
    global latest_image, image_history

    filename = f"static/detections/{int(time.time())}.jpg"

    cv2.putText(frame, label, (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 1,
                (0, 0, 255), 2)

    cv2.imwrite(filename, frame)

    latest_image = filename
    image_history.append(filename)
    image_history = image_history[-5:]

    # Persist to disk
    try:
        with open(HISTORY_FILE, "w") as f:
            json.dump({"history": image_history, "latest": latest_image}, f)
    except:
        pass

    return filename
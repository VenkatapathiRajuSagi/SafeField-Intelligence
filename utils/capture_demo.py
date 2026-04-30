import cv2
import time
import os
import json
from datetime import datetime, timedelta

# CONFIG
LOG_FILE = "logs/system_events.log"
STATE_FILE = "frontend/public/data/live_state.json"
DETECTIONS_DIR = "static/detections"
os.makedirs(DETECTIONS_DIR, exist_ok=True)

def capture_real_demo():
    print("📸 Opening Camera for Real Capture Demo...")
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("❌ Error: Could not open camera.")
        return

    # Warm up camera
    for _ in range(5):
        cap.read()
        
    ret, frame = cap.read()
    if not ret:
        print("❌ Error: Could not capture frame.")
        cap.release()
        return

    # Clear old history
    open(LOG_FILE, "w").close()

    # Capture 3 Real Snapshots with different labels
    snapshots = [
        ("SNAKE_CONFIRMED", "confidence=95.00"),
        ("FALL_CONFIRMED", "confidence=88.50"),
        ("INACTIVITY_DETECTED", "duration=10.00")
    ]

    for i, (event, details) in enumerate(snapshots):
        # ✅ BACKDATE TO YESTERDAY (MATCHES "PAST ALERTS")
        ts = int(time.time()) - (86400 * 1) + i 
        filename = f"{DETECTIONS_DIR}/{ts}.jpg"
        
        # Draw HUD on frame for realism
        demo_frame = frame.copy()
        cv2.putText(demo_frame, f"REAL CAPTURE (PROTOTYPE)", (30, 60), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        cv2.imwrite(filename, demo_frame)
        
        # Log it with yesterday's date
        time_str = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")
        with open(LOG_FILE, "a") as f:
            f.write(f"[{time_str}] {event} | {details}\n")
            
        print(f"✅ Captured {event} to {filename}")

    # Update live state with yesterday's timestamp for history visibility
    last_ts = int(time.time()) - 86400 + 2
    state = {
        "snake_detected": False,
        "fall_detected": False,
        "inactivity": False,
        "last_alert_type": "Fall (Prototype)",
        "last_alert_time": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S"),
        "image": f"static/detections/{last_ts}.jpg",
        "history": [f"static/detections/{ts}.jpg" for ts in range(last_ts-2, last_ts+1)],
        "timestamp": datetime.now().isoformat()
    }
    
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)

    cap.release()
    print("✨ Demo Capture Complete. Check the Dashboard!")

if __name__ == "__main__":
    capture_real_demo()

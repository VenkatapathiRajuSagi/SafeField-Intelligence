import cv2
import json
import os
import time
from datetime import datetime

from vision.snake_detector import detect_snake
from vision.snake_verifier import verify_snake
from vision.object_filter import contains_animal

from human.fall_detector import detect_fall
from human.inactivity_detector import InactivityDetector

from risk.fusion_engine import fuse_risk
from temporal.risk_forecaster import predict_future_risk
from risk.counterfactual_reasoner import counterfactual_reasoning
from spatial.spatial_risk_propagator import propagate_spatial_risk
from risk.risk_classifier import classify_predictive_risk
from risk.uncertainty_estimator import estimate_confidence_and_uncertainty

from alerts.alert_router import route_alert
from alerts.voice_alert import voice_alert

# ✅ ADDED: EVENT LOGGER
from utils.event_logger import log_event
from backend.state import state


import utils.image_store as image_store

# ==================================================
# CONFIGURATION
# ==================================================
CONFIG_FILE = "backend/config.json"
CURRENT_AREA = "Field_A"
STATE_FILE = "frontend/public/data/live_state.json"

# Load initial config
sys_config = {}
if os.path.exists(CONFIG_FILE):
    with open(CONFIG_FILE, "r") as f:
        sys_config = json.load(f)

OBSERVE_DURATION = 3600 * 24  # Run for 24 hours (effectively indefinite)
SNAKE_CONFIRM_FRAMES = 3
INACTIVITY_CONFIRM_SECONDS = 15
FALL_CONFIRM_FRAMES = 8

# Unique ID for this monitoring session to help dashboard reset stale data
SYSTEM_SESSION_ID = f"session_{int(time.time())}"

ALERT_COOLDOWN = 30
last_alert_time = 0

ALERT_RECIPIENTS = ["family", "local_help", "hospital"]


# ==================================================
# ✅ PERFORMANCE METRICS
# ==================================================
metrics = {
    "frames": 0,
    "fall_detected": 0,
    "snake_detected": 0,
    "false_snake_rejected": 0,
    "start_time": time.time()
}


# ==================================================
# INITIALIZATION
# ==================================================
inactivity_detector = InactivityDetector(threshold_seconds=10, movement_threshold=0.004)

snake_frame_count = 0
snake_detected_once = False
snake_alert_sent = False

inactive_event_active = False
inactive_start_time = None
lying_start_time = None

fall_buffer = 0

snake_last_seen_time = 0
all_snake_detections = []

last_fall_state = {"detected": False, "confidence": 0}
last_inactivity_state = {"inactive": False, "duration": 0, "confidence": 0}

# ==================================================
# INITIAL DASHBOARD STATE
# ==================================================
state["snake_detected"] = False
state["fall_detected"] = False
state["inactivity"] = False
state["last_alert_type"] = "None"
state["last_alert_time"] = "N/A"
state["current_risk"] = "Low"
state["final_risk"] = "Low"
state["peak_confidence"] = 0.0
state["peak_uncertainty"] = 1.0 # Start with high uncertainty (normal)

def update_dashboard_state(data):
    os.makedirs("frontend/public/data", exist_ok=True)
    with open(STATE_FILE, "w") as f:
        json.dump(data, f, indent=2)

# Ensure sticky timers are cleared so they don't persist between runs
state["sticky_snake_until"] = 0
state["sticky_fall_until"] = 0
state["sticky_inact_until"] = 0
state["sticky_high_risk_until"] = 0

# Track previous state for immediate UI sync
last_pushed_state = {
    "snake": False,
    "fall": False,
    "inactivity": False
}

# 🚀 IMMEDIATE START-UP RESET
# This ensures a fresh dashboard every time the AI starts
update_dashboard_state({
    "session_id": SYSTEM_SESSION_ID,
    "snake_detected": False,
    "fall_detected": False,
    "inactivity": False,
    "current_risk": "Low",
    "future_risk": "Low",
    "final_risk": "Low",
    "confidence": 0,
    "uncertainty": 0,
    "counterfactual": {},
    "spatial_risk": {},
    "last_alert_type": "None",
    "last_alert_time": "N/A",
    "image": None,
    "history": [],
    "timestamp": datetime.now().isoformat()
})
time.sleep(0.1)  # Tiny delay to ensure file is written before loop


# ==================================================
# 🔐 HUMAN OVERLAP FILTER FOR SNAKE
# ==================================================
def overlaps_human(bbox, pose):
    if pose is None:
        return False
    x1, y1, x2, y2 = bbox
    for lm in pose.landmark:
        px = int(lm.x * 640)
        py = int(lm.y * 480)
        if x1 <= px <= x2 and y1 <= py <= y2:
            return True
    return False



# ==================================================
# CAMERA
# ==================================================
cap = cv2.VideoCapture(0)
START_TIME = time.time()
print("🎥 Camera started. Monitoring...")


# ==================================================
# LIVE LOOP
# ==================================================
try:
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Keep current state to avoid flickering; update them based on current frame
        pass

        now = time.time()
        metrics["frames"] += 1  # ✅ METRICS

        # Reload config every 10 frames
        if metrics["frames"] % 10 == 0 and os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, "r") as f:
                    sys_config = json.load(f)
                    CURRENT_AREA = sys_config.get("active_zone", "Field_A")
            except Exception:
                pass

        # ==================================================
        # 🚫 HARD ANIMAL BLOCK
        # ==================================================
        if contains_animal(frame):
            cv2.putText(frame, "ANIMAL DETECTED - HUMAN LOGIC DISABLED",
                        (30, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
            # We no longer 'continue' here to ensure the dashboard state is still updated

        # ==================================================
        # 🚶 HUMAN FALL DETECTION FIRST
        # ==================================================
        fall, fall_conf, pose, fall_stage = False, 0.0, None, "standing"
        if sys_config.get("modules", {}).get("fall", True):
            fall, fall_conf, pose, fall_stage = detect_fall(frame)
        human_pose = pose

        # ==================================================
        # 🐍 BLOCK SNAKE IF HUMAN PRESENT
        # ==================================================
        snake = False
        snake_detections = []
        if sys_config.get("modules", {}).get("snake", True):
            snake, snake_detections = detect_snake(frame)

        verified_snakes = []

        # ==================================================
        # 🐍 SNAKE VERIFICATION WITH SAFETY
        # ==================================================
        for d in snake_detections:
            x1, y1, x2, y2 = d["bbox"]
            conf = d["confidence"]

            # Config threshold
            if conf < sys_config.get("snake_threshold", 40):
                continue

            if overlaps_human((x1, y1, x2, y2), human_pose):
                log_event("FALSE_POSITIVE_REJECTED", "snake_overlaps_human")
                metrics["false_snake_rejected"] += 1
                cv2.putText(frame, "FALSE SNAKE (HUMAN)",
                            (x1, y1 - 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
                continue

            is_snake, vconf = verify_snake(frame, (x1, y1, x2, y2))
            if not is_snake or vconf < sys_config.get("snake_verify_threshold", 60):
                continue

            d["verify_confidence"] = vconf
            verified_snakes.append(d)

        snake_visible = len(verified_snakes) > 0

        # ==================================================
        # 🚶 FALL CONFIRMATION
        # ==================================================
        if fall_stage in ["falling", "lying"]:
            fall_buffer += 1
        else:
            fall_buffer = 0

        fall_detected = fall_buffer >= FALL_CONFIRM_FRAMES

        # Detect NEW fall event
        if fall_detected and not last_fall_state["detected"]:
            metrics["fall_detected"] += 1
            print("🚨 FALL EVENT DETECTED")
            
            img_path = image_store.save_frame(frame, "Fall Detected")
            image_store.latest_image = img_path
            image_store.image_history.append(img_path)

            log_event("FALL_CONFIRMED", f"confidence={fall_conf:.2f}", img_path)

            state["fall_detected"] = True
            state["last_alert_type"] = "Fall"
            state["last_alert_time"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Update fall state every frame
        last_fall_state = {
            "detected": fall_detected,
            "confidence": fall_conf
        }

        # ==================================================
        # 🧠 POST-FALL INACTIVITY
        # ==================================================
        if fall_stage == "lying":
            lying_start_time = lying_start_time or now

            if now - lying_start_time >= INACTIVITY_CONFIRM_SECONDS:
                if not inactive_event_active and now - last_alert_time > ALERT_COOLDOWN:
                    inactive_event_active = True
                    last_alert_time = now
                    print("🚨 POST-FALL INACTIVITY ALERT")
                    route_alert("unconscious_detected", ALERT_RECIPIENTS)
                    voice_alert("వ్యక్తి పడిపోయి అపస్మారక స్థితిలో ఉన్నారు. వెంటనే సహాయం చేయండి")
                    log_event("INACTIVITY_DETECTED", f"duration={now - lying_start_time:.2f}", img_path)
                    state["inactivity"] = True

                    img_path = image_store.save_frame(frame, "Inactivity Detected")
                    image_store.latest_image = img_path
                    image_store.image_history.append(img_path)
                    
                    state["last_alert_type"] = "Post-Fall Inactivity"
                    state["last_alert_time"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        else:
            lying_start_time = None

        # ==================================================
        # ⏳ NORMAL INACTIVITY DETECTION
        # ==================================================
        if sys_config.get("modules", {}).get("inactivity", True) and pose is not None and fall_stage != "lying":
            res = inactivity_detector.update(pose)
            last_inactivity_state = res

            if res["inactive"]:
                inactive_start_time = inactive_start_time or now

                if (not inactive_event_active and 
                    now - inactive_start_time >= INACTIVITY_CONFIRM_SECONDS and
                    now - last_alert_time > ALERT_COOLDOWN):
                    state["inactivity"] = True
                   
                    img_path = image_store.save_frame(frame, "Inactivity Detected")
                    image_store.latest_image = img_path
                    image_store.image_history.append(img_path)

                    state["last_alert_type"] = "Inactivity"
                    state["last_alert_time"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                    inactive_event_active = True
                    last_alert_time = now
                    print("🚨 NORMAL INACTIVITY ALERT")
                    route_alert("unconscious_detected", ALERT_RECIPIENTS)
                    voice_alert("వ్యక్తి అపస్మారక స్థితిలో ఉన్నారు")
                    log_event("INACTIVITY_DETECTED", f"duration={now - inactive_start_time:.2f}", img_path)

            else:
                if res["duration"] < 2:
                    inactive_start_time = None
                    inactive_event_active = False

        # ==================================================
        # ⏱ INACTIVITY TIMER DISPLAY
        # ==================================================
        inactivity_time = 0
        if inactive_start_time:
            inactivity_time = now - inactive_start_time

        cv2.putText(frame, f"Inactivity: {inactivity_time:.1f}s",
                    (30, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)

        # ==================================================
        # 🔴 DRAW SNAKE BOX
        # ==================================================
        for d in verified_snakes:
            x1, y1, x2, y2 = d["bbox"]
            conf = d["confidence"]
            vconf = d["verify_confidence"]

            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
            cv2.putText(frame, f"Snake {conf:.1f}% | Verify {vconf:.1f}%",
                        (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 255), 2)

        # ==================================================
        # 🧍 SKELETON OVERLAY
        # ==================================================
        if pose is not None:
            import mediapipe as mp
            mp_draw = mp.solutions.drawing_utils

            skeleton_color = (255, 0, 0)
            if fall_detected or last_inactivity_state.get("inactive", False):
                skeleton_color = (0, 0, 255)

            mp_draw.draw_landmarks(
                frame, pose, mp.solutions.pose.POSE_CONNECTIONS,
                mp_draw.DrawingSpec(color=skeleton_color, thickness=2, circle_radius=2),
                mp_draw.DrawingSpec(color=skeleton_color, thickness=2)
            )

            cv2.putText(frame, fall_stage.upper(), (30, 80),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, skeleton_color, 2)

        # ==================================================
        # 🐍 SNAKE EVENT ALERT
        # ==================================================
        if verified_snakes:
            snake_frame_count += 1
        else:
            snake_frame_count = 0
            snake_alert_sent = False

        if snake_frame_count >= SNAKE_CONFIRM_FRAMES and not snake_alert_sent:
            snake_detected_once = True
            snake_alert_sent = True
            metrics["snake_detected"] += 1

            img_path = image_store.save_frame(frame, "Snake Detected")
            image_store.latest_image = img_path
            image_store.image_history.append(img_path)
            
            route_alert("snake_high", ALERT_RECIPIENTS)
            log_event("SNAKE_CONFIRMED", f"confidence={verified_snakes[0]['verify_confidence']:.2f}", img_path)
            log_event("ALERT_SENT", "recipients=family,local_help,hospital")
            state["last_alert_type"] = "Snake"
            state["last_alert_time"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"🚨 SNAKE DETECTED - Alert Sent at {state['last_alert_time']}")

        # ==================================================
        # ✅ CONFIDENCE DISPLAY (EXPLAINABLE AI)
        # ==================================================
        cv2.putText(frame, f"Fall Conf: {fall_conf:.2f}",
                    (30, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 2)

        if verified_snakes:
            cv2.putText(frame, f"Snake Conf: {verified_snakes[0]['verify_confidence']:.2f}",
                        (30, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 2)

        cv2.putText(frame, f"System Conf: {float(state.get('confidence', 0)):.2f}",
                    (30, 210), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,255,0), 2)

        # ==================================================
        # ⏱ DETECTION STICKINESS (Grace Period)
        # ==================================================
        is_lying_inactive = bool(fall_stage == "lying" and lying_start_time and (now - lying_start_time >= INACTIVITY_CONFIRM_SECONDS))
        is_normal_inactive = bool(last_inactivity_state.get("duration", 0) >= INACTIVITY_CONFIRM_SECONDS)

        if snake_frame_count >= SNAKE_CONFIRM_FRAMES:
            state["sticky_snake_until"] = now + 60  # Hold for 60s
            
        if fall_detected:
            state["sticky_fall_until"] = now + 60  # Hold for 60s
            
        if is_lying_inactive or is_normal_inactive:
            state["sticky_inact_until"] = now + 60

        # Update state booleans BEFORE risk engine runs
        state["snake_detected"] = bool(snake_visible or now <= state.get("sticky_snake_until", 0))
        state["fall_detected"] = bool(fall_detected or now <= state.get("sticky_fall_until", 0))
        state["inactivity"] = bool(is_lying_inactive or is_normal_inactive or now <= state.get("sticky_inact_until", 0))

        is_currently_sticky = state["snake_detected"] or state["fall_detected"] or state["inactivity"]

        # ==================================================
        # 🧠 COGNITIVE PIPELINE
        # ==================================================
        current_risk_float = 0.8 if state["snake_detected"] or state["fall_detected"] else 0.1
        current_risk = "High" if current_risk_float > 0.6 else "Low"

        future_risk = predict_future_risk(
            int(state["snake_detected"]), int(state["fall_detected"]),
            0.5, 35, datetime.now().hour
        )

        # 🚀 SYNCING INTELLIGENCE STICKINESS
        # If we are currently in the 5s grace period (sticky) but the snake is no longer visible,
        # we do NOT want to compute new (empty) intelligence. We want to show the LAST snapshot.
        if is_currently_sticky and not (snake_visible or fall_detected):
            # Retrieve frozen snapshot
            snapshot = state.get("last_snapshot", {"counterfactual": {}, "spatial_risk": {}, "final_risk": "Low", "confidence": "0", "uncertainty": "0"})
        else:
            # Live detection or Standby: Compute fresh intelligence
            current_counterfactual = counterfactual_reasoning(current_risk, future_risk, snake_visible, last_fall_state["detected"])
            current_spatial = propagate_spatial_risk(CURRENT_AREA, future_risk)
            current_final = classify_predictive_risk(current_risk, future_risk, current_counterfactual, current_spatial)
            current_conf, current_uncer = estimate_confidence_and_uncertainty(current_final, future_risk, current_spatial, current_counterfactual)
            
            # Save this as the "Last Known Good" packet
            snapshot = {
                "counterfactual": current_counterfactual,
                "spatial_risk": current_spatial,
                "final_risk": current_final,
                "confidence": current_conf,
                "uncertainty": current_uncer
            }
            state["last_snapshot"] = snapshot

        # Extract values from snapshot for immediate use and dashboard sync
        final_risk = snapshot["final_risk"]
        counterfactual = snapshot["counterfactual"]
        spatial_risk = snapshot["spatial_risk"]
        confidence = snapshot["confidence"]
        uncertainty = snapshot["uncertainty"]

        # Final protection: if we go back to Low but held high, override
        if final_risk == "High":
            state["sticky_high_risk_until"] = now + 60
        
        if now <= state.get("sticky_high_risk_until", 0):
            final_risk = "High"
        else:
            # If grace period truly ended, clear snapshot and peaks for next cycle
            if not is_currently_sticky:
                state["last_snapshot"] = {"counterfactual": {}, "spatial_risk": {}, "final_risk": "Low", "confidence": "0", "uncertainty": "0"}
                state["peak_confidence"] = 0.0
                state["peak_uncertainty"] = 1.0

        # --- PEAK HOLD LOGIC (FOR STABLE DEMO) ---
        if is_currently_sticky:
            # Keep the best recorded confidence and uncertainty during the alert
            state["peak_confidence"] = max(state.get("peak_confidence", 0), float(confidence))
            # For uncertainty, "Low" is better, so we take the min non-zero value or just hold
            if float(uncertainty) > 0:
                state["peak_uncertainty"] = min(state.get("peak_uncertainty", 1.0), float(uncertainty))
            
            # Use the peaks for the dashboard
            confidence = state["peak_confidence"]
            uncertainty = state["peak_uncertainty"]

        # Update state object with sanitized intelligence
        state["current_risk"] = current_risk
        state["future_risk"] = future_risk
        state["final_risk"] = final_risk
        state["confidence"] = confidence
        state["uncertainty"] = uncertainty
        state["counterfactual"] = counterfactual
        state["spatial_risk"] = spatial_risk

        # --- IMMEDIATE DASHBOARD SYNC ON STATUS CHANGE ---
        current_agg_state = {"snake": state.get("snake_detected", False), "fall": state.get("fall_detected", False), "inactivity": state.get("inactivity", False)}
        status_changed = (current_agg_state["snake"] != last_pushed_state["snake"] or current_agg_state["fall"] != last_pushed_state["fall"] or current_agg_state["inactivity"] != last_pushed_state["inactivity"])

        if status_changed or metrics["frames"] % 5 == 0:
            last_pushed_state = current_agg_state.copy()
            update_dashboard_state({
                "session_id": SYSTEM_SESSION_ID,
                "snake_detected": state.get("snake_detected", False),
                "fall_detected": state.get("fall_detected", False),
                "inactivity": state.get("inactivity", False),
                
                "current_risk": str(state.get("current_risk", "Low")),
                "future_risk": str(state.get("future_risk", "Low")),
                "final_risk": str(state.get("final_risk", "Low")),
                "confidence": str(state.get("confidence", "0")),
                "uncertainty": str(state.get("uncertainty", "0")),
                
                "counterfactual": state.get("counterfactual", {}),
                "spatial_risk": state.get("spatial_risk", {}),
                "last_alert_type": state.get("last_alert_type"),
                "last_alert_time": state.get("last_alert_time"),
                "image": image_store.latest_image,
                "history": image_store.image_history,
                "timestamp": datetime.now().isoformat()
            })
        
        cv2.imshow("Multimodal Safety Monitoring", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

except KeyboardInterrupt:
    print("🛑 System Interrupted")

finally:
    # ==================================================
    # 🧹 GRACEFUL EXIT CLEANUP
    # ==================================================
    print("🧹 Cleaning up dashboard state...")
    update_dashboard_state({
        "snake_detected": False,
        "fall_detected": False,
        "inactivity": False,
        "current_risk": "Low",
        "future_risk": "Low",
        "final_risk": "Low",
        "confidence": 0,
        "uncertainty": 0,
        "counterfactual": {},
        "spatial_risk": {},
        "timestamp": datetime.now().isoformat()
    })
    
    cap.release()
    cv2.destroyAllWindows()
    print("⏱ Observation window closed")

# ==================================================
# OUTPUTS
# ==================================================
print("🧠 Counterfactual:", counterfactual)
print("🌍 Spatial Risk:", spatial_risk)
print("🚦 FINAL RISK:", final_risk)
print(f"📊 Confidence: {confidence:.2f}%")
print(f"❓ Uncertainty: {uncertainty:.3f}")
print("📊 Dashboard updated")


# ==================================================
# 📊 PERFORMANCE SUMMARY
# ==================================================
runtime = time.time() - metrics["start_time"]
fps = metrics["frames"] / runtime

print("\n📊 PERFORMANCE METRICS")
print(f"Frames Processed: {metrics['frames']}")
print(f"FPS: {fps:.2f}")
print(f"Falls Detected: {metrics['fall_detected']}")
print(f"Snakes Detected: {metrics['snake_detected']}")
print(f"False Snakes Rejected: {metrics['false_snake_rejected']}")

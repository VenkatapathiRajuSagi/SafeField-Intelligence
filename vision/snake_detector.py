from ultralytics import YOLO
import os

MODEL_PATH = os.path.join("models", "snake_yolo.pt")

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"❌ Trained model not found: {MODEL_PATH}")

model = YOLO(MODEL_PATH)

def detect_snake(frame, conf_threshold=0.25):
    """
    Returns:
    snake_detected (bool)
    detections: list of dicts
    """
    results = model(
        frame,
        imgsz=640,          # ✅ stabilize inference
        conf=conf_threshold,
        verbose=False
    )[0]

    detections = []

    if results.boxes is None:
        return False, []

    for box in results.boxes:
        conf = float(box.conf[0]) * 100  # convert to %

        x1, y1, x2, y2 = map(int, box.xyxy[0])

        detections.append({
            "bbox": (x1, y1, x2, y2),
            "confidence": round(conf, 2)
        })

    return len(detections) > 0, detections

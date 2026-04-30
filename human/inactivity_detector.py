import time
import numpy as np

class InactivityDetector:
    def __init__(self, threshold_seconds=10, movement_threshold=0.004):
        self.threshold = threshold_seconds
        self.movement_threshold = movement_threshold
        self.last_movement_time = time.time()
        self.last_landmarks = None

    def _extract_xy(self, pose_landmarks):
        if pose_landmarks is None or not hasattr(pose_landmarks, "landmark"):
            return None
        return np.array([[lm.x, lm.y] for lm in pose_landmarks.landmark])

    def update(self, pose_landmarks):
        now = time.time()
        current = self._extract_xy(pose_landmarks)

        if current is not None and self.last_landmarks is not None:
            movement = np.mean(np.linalg.norm(current - self.last_landmarks, axis=1))

            # 🔥 Ignore tiny jitter
            if movement > self.movement_threshold * 4:
                self.last_movement_time = now

        if current is not None:
            self.last_landmarks = current

        duration = int(now - self.last_movement_time)
        inactive = duration >= self.threshold
        confidence = min(duration / self.threshold, 1.0)

        return {
            "inactive": inactive,
            "duration": duration,
            "confidence": round(confidence, 2)
        }

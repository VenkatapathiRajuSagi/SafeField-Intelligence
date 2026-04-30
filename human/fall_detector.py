import cv2
import mediapipe as mp
import time
from collections import deque

mp_pose = mp.solutions.pose
pose = mp_pose.Pose()

hip_y_history = deque(maxlen=6)
time_history = deque(maxlen=6)

def detect_fall(frame):
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(rgb)

    if not results.pose_landmarks:
        hip_y_history.clear()
        time_history.clear()
        return False, 0, None, "no_person"

    lm = results.pose_landmarks.landmark

    ls = lm[mp_pose.PoseLandmark.LEFT_SHOULDER]
    rs = lm[mp_pose.PoseLandmark.RIGHT_SHOULDER]
    lh = lm[mp_pose.PoseLandmark.LEFT_HIP]
    rh = lm[mp_pose.PoseLandmark.RIGHT_HIP]

    shoulder_y = (ls.y + rs.y) / 2
    hip_y = (lh.y + rh.y) / 2

    hip_y_history.append(hip_y)
    time_history.append(time.time())

    velocity = 0
    if len(hip_y_history) >= 2:
        dy = hip_y_history[-1] - hip_y_history[-2]
        dt = time_history[-1] - time_history[-2]
        if dt > 0:
            velocity = dy / dt

    posture_diff = abs(shoulder_y - hip_y)
    lying = posture_diff < 0.12
    falling_fast = velocity > 0.4

    # 🔥 REALISTIC FALL LOGIC
    fall_detected = lying and (falling_fast or velocity > 0.25)

    confidence = 0
    if falling_fast or velocity > 0.25:
        confidence += 40
    if lying:
        confidence += 60

    stage = "normal"
    if falling_fast:
        stage = "risk"
    if lying:
        stage = "lying"
    if fall_detected:
        stage = "fall"

    return fall_detected, confidence, results.pose_landmarks, stage

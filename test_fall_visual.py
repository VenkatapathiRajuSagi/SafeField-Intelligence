fall, confidence, bbox, landmarks = detect_fall(frame)

if landmarks:
    mp_draw.draw_landmarks(
        frame,
        landmarks,
        mp_pose.POSE_CONNECTIONS
    )

if fall and bbox:
    x1, y1, x2, y2 = bbox

    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 3)
    cv2.putText(
        frame,
        f"FALL DETECTED ({confidence}%)",
        (x1, y1 - 10),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.9,
        (0, 0, 255),
        3
    )

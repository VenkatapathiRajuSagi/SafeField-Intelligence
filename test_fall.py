import cv2
from human.fall_detector import detect_fall

cap = cv2.VideoCapture(0)

print("🎥 Human fall test started (press Q to quit)")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    fall = detect_fall(frame)

    if fall:
        cv2.putText(
            frame,
            "FALL DETECTED",
            (50, 50),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0, 0, 255),
            3
        )
        print("🚨 FALL DETECTED")

    cv2.imshow("Human Fall Detection", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()

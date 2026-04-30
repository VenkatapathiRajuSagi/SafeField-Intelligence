import cv2
from vision.snake_detector import detect_snake

cap = cv2.VideoCapture(0)

print("🐍 SNAKE-ONLY LIVE TEST (press q to quit)")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    snake, detections = detect_snake(frame)

    print("Snake:", snake, "| Detections:", detections)

    if snake:
        for d in detections:
            x1, y1, x2, y2 = d["bbox"]
            conf = d["confidence"]

            cv2.rectangle(frame, (x1,y1), (x2,y2), (0,0,255), 2)
            cv2.putText(
                frame,
                f"Snake {conf}%",
                (x1, y1-10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0,0,255),
                2
            )

    cv2.imshow("Snake Only Detection", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()

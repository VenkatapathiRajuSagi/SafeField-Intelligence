import cv2
from vision.snake_detector import detect_snake

cap = cv2.VideoCapture(0)

print("🎥 Snake test mode (press q to quit)")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    snake, detections = detect_snake(frame)

    print("Snake:", snake, "Detections:", detections)

    for d in detections:
        x1, y1, x2, y2 = d["bbox"]
        cv2.rectangle(frame, (x1,y1),(x2,y2),(0,0,255),2)

    cv2.imshow("Snake Test", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()

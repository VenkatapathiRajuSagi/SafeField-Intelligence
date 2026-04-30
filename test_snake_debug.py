import cv2
from ultralytics import YOLO

model = YOLO("models/snake_yolo.pt")

cap = cv2.VideoCapture(0)
print("🐍 Snake debug mode — press q to quit")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    results = model(frame, conf=0.2, verbose=False)[0]

    if results.boxes:
        print("DETECTIONS FOUND:", len(results.boxes))

        for box in results.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            conf = float(box.conf[0]) * 100

            cv2.rectangle(frame, (x1,y1), (x2,y2), (0,0,255), 2)
            cv2.putText(frame, f"{conf:.1f}%", (x1, y1-10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,0,255), 2)

    cv2.imshow("Snake Debug", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()

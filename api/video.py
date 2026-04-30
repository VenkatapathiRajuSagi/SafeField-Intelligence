from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import cv2

router = APIRouter()

snake_cam = cv2.VideoCapture(0)
human_cam = cv2.VideoCapture(1)

def gen_frames(cap):
    while True:
        success, frame = cap.read()
        if not success:
            break
        _, buffer = cv2.imencode(".jpg", frame)
        frame = buffer.tobytes()
        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"
        )

@router.get("/video/snake")
def snake_video():
    return StreamingResponse(gen_frames(snake_cam),
        media_type="multipart/x-mixed-replace; boundary=frame")

@router.get("/video/human")
def human_video():
    return StreamingResponse(gen_frames(human_cam),
        media_type="multipart/x-mixed-replace; boundary=frame")

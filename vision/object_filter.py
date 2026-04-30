from ultralytics import YOLO

# Load COCO pretrained model ONCE
coco_model = YOLO("yolov8n.pt")

# Animals we want to block
ANIMAL_CLASSES = {
    "elephant", "dog", "cat", "horse",
    "cow", "sheep", "goat", "zebra", "bear"
}

def contains_animal(frame):
    """
    Returns True if a large animal is detected in the frame
    """
    results = coco_model(frame, verbose=False)[0]

    for cls_id in results.boxes.cls.tolist():
        name = coco_model.names[int(cls_id)]
        if name in ANIMAL_CLASSES:
            return True

    return False


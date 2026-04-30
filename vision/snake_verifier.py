import torch
import torchvision.transforms as T
from torchvision import models
from PIL import Image
import cv2

device = "cuda" if torch.cuda.is_available() else "cpu"

# --------------------------------------------------
# Build the model architecture
# --------------------------------------------------
model = models.mobilenet_v2(pretrained=False)
model.classifier[1] = torch.nn.Linear(model.last_channel, 2)

# --------------------------------------------------
# Load weights safely (PyTorch 2.6+ compliant)
# --------------------------------------------------
model.load_state_dict(
    torch.load("models/snake_verifier.pt", map_location=device)
)

model.to(device)
model.eval()

# --------------------------------------------------
# Image preprocessing
# --------------------------------------------------
transform = T.Compose([
    T.Resize((224, 224)),
    T.ToTensor(),
    T.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

def verify_snake(frame, bbox):
    x1, y1, x2, y2 = bbox
    crop = frame[y1:y2, x1:x2]

    if crop is None or crop.size == 0:
        return False, 0.0

    crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
    img = Image.fromarray(crop_rgb)

    tensor = transform(img).unsqueeze(0).to(device)

    with torch.no_grad():
        logits = model(tensor)
        prob = torch.softmax(logits, dim=1)[0][1].item()

    return prob > 0.82, prob * 100

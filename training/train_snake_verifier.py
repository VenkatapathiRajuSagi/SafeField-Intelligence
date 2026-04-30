import os
import torch
import torchvision.transforms as T
from torchvision import datasets, models
from torch.utils.data import DataLoader
from torch import nn, optim
from tqdm import tqdm

# ================= CONFIG =================
DATA_DIR = "verifier_dataset"
MODEL_PATH = "models/snake_verifier.pt"

IMG_SIZE = 224
BATCH_SIZE = 16
EPOCHS = 10
LR = 1e-4

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
# =========================================

os.makedirs("models", exist_ok=True)

transform = T.Compose([
    T.Resize((IMG_SIZE, IMG_SIZE)),
    T.ToTensor(),
    T.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

dataset = datasets.ImageFolder(DATA_DIR, transform=transform)
loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)

print("📂 Classes:", dataset.classes)

model = models.mobilenet_v2(pretrained=True)
model.classifier[1] = nn.Linear(model.last_channel, 2)
model.to(DEVICE)

criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=LR)

print("🚀 Training Snake Verifier Model...")

for epoch in range(EPOCHS):
    model.train()
    total_loss = 0

    for images, labels in tqdm(loader, desc=f"Epoch {epoch+1}/{EPOCHS}"):
        images, labels = images.to(DEVICE), labels.to(DEVICE)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        total_loss += loss.item()

    avg_loss = total_loss / len(loader)
    print(f"✅ Epoch {epoch+1} completed | Loss: {avg_loss:.4f}")

torch.save(model.state_dict(), MODEL_PATH)
print(f"🎉 Verifier training complete")
print(f"💾 Model saved to: {MODEL_PATH}")


import os
import cv2
import random
from bing_image_downloader import downloader
from tqdm import tqdm

# ---------------- CONFIG ----------------
BASE_DIR = "non_snake_dataset"
CLASSES = {
    "dog outdoor": 120,
    "cat outdoor": 120,
    "human hand outdoor": 150,
    "person walking field": 150,
    "rope on ground": 120,
    "garden hose field": 120,
    "wooden stick ground": 100,
    "metal pipe ground": 100
}

IMG_SIZE = 640
TRAIN_RATIO = 0.8
# ----------------------------------------

def prepare_dirs():
    for split in ["train", "val"]:
        os.makedirs(f"{BASE_DIR}/images/{split}", exist_ok=True)
        os.makedirs(f"{BASE_DIR}/labels/{split}", exist_ok=True)

def download_images():
    for query, limit in CLASSES.items():
        print(f"Downloading: {query}")
        downloader.download(
            query,
            limit=limit,
            output_dir="raw_images",
            adult_filter_off=True,
            force_replace=False,
            timeout=60
        )

def process_images():
    all_images = []

    for root, _, files in os.walk("raw_images"):
        for file in files:
            if file.lower().endswith((".jpg", ".png", ".jpeg")):
                all_images.append(os.path.join(root, file))

    random.shuffle(all_images)
    split_idx = int(len(all_images) * TRAIN_RATIO)

    splits = {
        "train": all_images[:split_idx],
        "val": all_images[split_idx:]
    }

    for split, images in splits.items():
        for img_path in tqdm(images, desc=f"Processing {split}"):
            img = cv2.imread(img_path)
            if img is None:
                continue

            img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
            filename = os.path.basename(img_path)
            name, _ = os.path.splitext(filename)

            cv2.imwrite(f"{BASE_DIR}/images/{split}/{filename}", img)

            # Empty YOLO label (background)
            open(f"{BASE_DIR}/labels/{split}/{name}.txt", "w").close()

def create_yaml():
    yaml_content = f"""
path: {BASE_DIR}
train: images/train
val: images/val

names:
  0: snake
"""
    with open(f"{BASE_DIR}/dataset.yaml", "w") as f:
        f.write(yaml_content.strip())

if __name__ == "__main__":
    prepare_dirs()
    download_images()
    process_images()
    create_yaml()
    print("✅ Non-snake dataset ready!")


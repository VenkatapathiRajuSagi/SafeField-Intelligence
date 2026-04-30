import os
import cv2

IMG_DIR = "data/snake_dataset/train/images"
LBL_DIR = "data/snake_dataset/train/labels"
OUT_DIR = "verifier_dataset/snake"

os.makedirs(OUT_DIR, exist_ok=True)

for lbl_file in os.listdir(LBL_DIR):
    if not lbl_file.endswith(".txt"):
        continue

    img_file = lbl_file.replace(".txt", ".jpg")
    img_path = os.path.join(IMG_DIR, img_file)
    lbl_path = os.path.join(LBL_DIR, lbl_file)

    img = cv2.imread(img_path)
    if img is None:
        continue

    h, w = img.shape[:2]

    with open(lbl_path) as f:
        for i, line in enumerate(f):
            cls, xc, yc, bw, bh = map(float, line.split())

            x1 = int((xc - bw / 2) * w)
            y1 = int((yc - bh / 2) * h)
            x2 = int((xc + bw / 2) * w)
            y2 = int((yc + bh / 2) * h)

            crop = img[y1:y2, x1:x2]
            if crop.size == 0:
                continue

            out_name = f"{img_file}_{i}.jpg"
            cv2.imwrite(os.path.join(OUT_DIR, out_name), crop)

print("✅ Snake crops extracted successfully")


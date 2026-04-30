import numpy as np
import pandas as pd

SEQUENCE_LENGTH = 10   # last 10 frames (~5–10 sec)

data = []

for _ in range(1000):
    snake = np.random.randint(0, 2)
    fall = np.random.randint(0, 2)
    motion = np.random.uniform(0, 1)
    temp = np.random.uniform(25, 45)
    hour = np.random.randint(0, 24)

    risk_future = 1 if (snake or fall or temp > 38) else 0

    data.append([snake, fall, motion, temp, hour, risk_future])

df = pd.DataFrame(
    data,
    columns=["snake", "fall", "motion", "temp", "hour", "future_risk"]
)

df.to_csv("data/temporal_risk_data.csv", index=False)
print("✅ Temporal dataset generated")

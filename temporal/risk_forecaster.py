import torch
import torch.nn as nn
import numpy as np
from collections import deque

SEQ_LEN = 5

class RiskLSTM(nn.Module):
    def __init__(self):
        super().__init__()
        self.lstm = nn.LSTM(5, 32, batch_first=True)
        self.fc = nn.Linear(32, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        _, (h, _) = self.lstm(x)
        return self.sigmoid(self.fc(h[-1]))

model = RiskLSTM()
model.load_state_dict(torch.load("models/lstm_risk_model.pth"))
model.eval()

sequence = deque(maxlen=SEQ_LEN)

def predict_future_risk(snake, fall, motion, temp, hour):
    sequence.append([snake, fall, motion, temp, hour])

    if len(sequence) < SEQ_LEN:
        return "Low"

    # ✅ BIAS FIX: If the entire current sequence contains zero detections, 
    # force return "Low" to ensure the dashboard "resets" to safe state.
    recent_activity = np.sum([s[0] + s[1] for s in list(sequence)])
    if recent_activity == 0:
        return "Low"

    x = torch.tensor([sequence], dtype=torch.float32)
    prob = model(x).item()

    if prob > 0.7:
        return "High"
    elif prob > 0.4:
        return "Medium"
    return "Low"

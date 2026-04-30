import torch
import torch.nn as nn
import pandas as pd
import numpy as np

SEQ_LEN = 5
INPUT_SIZE = 5
HIDDEN = 32

df = pd.read_csv("data/temporal_risk_data.csv")

X, y = [], []

for i in range(len(df) - SEQ_LEN):
    X.append(df.iloc[i:i+SEQ_LEN, :-1].values)
    y.append(df.iloc[i+SEQ_LEN]["future_risk"])

X = torch.tensor(np.array(X), dtype=torch.float32)
y = torch.tensor(y, dtype=torch.float32).unsqueeze(1)

class RiskLSTM(nn.Module):
    def __init__(self):
        super().__init__()
        self.lstm = nn.LSTM(INPUT_SIZE, HIDDEN, batch_first=True)
        self.fc = nn.Linear(HIDDEN, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        _, (h, _) = self.lstm(x)
        return self.sigmoid(self.fc(h[-1]))

model = RiskLSTM()
criterion = nn.BCELoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

for epoch in range(10):
    optimizer.zero_grad()
    outputs = model(X)
    loss = criterion(outputs, y)
    loss.backward()
    optimizer.step()
    print(f"Epoch {epoch+1}, Loss: {loss.item():.4f}")

torch.save(model.state_dict(), "models/lstm_risk_model.pth")
print("✅ LSTM risk model trained & saved")

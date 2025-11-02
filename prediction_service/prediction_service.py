import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.preprocessing import MinMaxScaler
from typing import List
import traceback
from models import DailyRecord

# Constants
SEQUENCE_LENGTH = 60
MODEL_PATH = 'lstm_stock_predictor.pt' 
INPUT_SIZE = 4 
HIDDEN_SIZE = 50 
NUM_LAYERS = 2   

class LSTMModel(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers):
        super(LSTMModel, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, 1)

    def forward(self, x):
        # x shape: (batch_size, seq_len, input_size)
        out, _ = self.lstm(x)        
        out = self.fc(out[:, -1, :])
        return out

# Global Model Loading
try:
    PYTORCH_MODEL = LSTMModel(INPUT_SIZE, HIDDEN_SIZE, NUM_LAYERS)
    PYTORCH_MODEL.load_state_dict(torch.load(MODEL_PATH))
    PYTORCH_MODEL.eval()
    print(f"PyTorch model '{MODEL_PATH}' loaded successfully.")
except Exception as e:
    PYTORCH_MODEL = None
    print(f"Error loading PyTorch model: {e}")

class PredictionService:
    @staticmethod
    def get_model_status():
        """Check if PyTorch model is loaded."""
        return PYTORCH_MODEL is not None

    @staticmethod
    def preprocess_data(historical_data: List[DailyRecord]): 
        """Convert historical records to scaled PyTorch tensor with 4 features."""
        
        # Reverse the data since it arrives in reverse chronological order
        historical_data = list(reversed(historical_data))
        
        # Convert Pydantic models to dicts
        raw_data = [d.model_dump() for d in historical_data]
        df = pd.DataFrame(raw_data)
        df.columns = [str(col).lower() for col in df.columns] 
        
        required_cols = ['open', 'high', 'low', 'close', 'volume']
        if len(df.columns) != len(required_cols):
            raise ValueError(
                f"Input data has {len(df.columns)} columns, but 5 columns are required for features."
                f" Please ensure each day's record includes exactly: {required_cols}"
            )
        
        df.columns = required_cols    
        
        # Convert to numeric types
        try:
            for col in ['open', 'high', 'low', 'close']:
                df[col] = pd.to_numeric(df[col], errors='raise')
            df['volume'] = pd.to_numeric(df['volume'], errors='raise').astype(int)
        except Exception as e:
            raise ValueError(f"Failed to convert data to numeric types. Check input values. Error: {e}")
        
        if len(df) < SEQUENCE_LENGTH + 1:
            raise ValueError(f"Historical data must be at least {SEQUENCE_LENGTH + 1} days long for feature calculation.")

        # Feature Engineering
        df['Return'] = df['close'].pct_change()
        df['Daily_Range'] = (df['high'] - df['low']) / df['close'].shift(1)
        df['Avg_Volume'] = df['volume'].rolling(window=SEQUENCE_LENGTH).mean()
        df['Rel_Volume'] = df['volume'] / df['Avg_Volume']
        df['Close_Price'] = df['close']
        
        df.dropna(inplace=True) 
        
        feature_cols = ['Return', 'Daily_Range', 'Rel_Volume', 'Close_Price']
        input_data_df = df[feature_cols].tail(SEQUENCE_LENGTH) 

        if len(input_data_df) < SEQUENCE_LENGTH:
            raise ValueError(f"Not enough data remaining for a {SEQUENCE_LENGTH}-day sequence after NaN removal. Data has {len(input_data_df)} days.")

        scaler = MinMaxScaler(feature_range=(0, 1))
        scaled_input = scaler.fit_transform(input_data_df.values)

        X_input_tensor = torch.from_numpy(scaled_input).float().reshape(1, SEQUENCE_LENGTH, INPUT_SIZE)
        
        return X_input_tensor, scaler

    @staticmethod
    @torch.no_grad()
    def predict_future(initial_input_tensor: torch.Tensor, n_days: int, scaler: MinMaxScaler) -> List[float]:
        """Perform multi-day sequence prediction iteratively."""
        
        if PYTORCH_MODEL is None:
            raise RuntimeError("PyTorch model is not available.")

        temp_input_np = initial_input_tensor.flatten(start_dim=1).cpu().numpy().reshape(-1, INPUT_SIZE)
        prediction_output = []
        
        # Get scaling parameters for Close_Price (index 3)
        close_price_min = scaler.data_min_[3]
        close_price_range = scaler.data_range_[3]

        for _ in range(n_days):
            x_input = torch.from_numpy(temp_input_np[-SEQUENCE_LENGTH:]).float().reshape(1, SEQUENCE_LENGTH, INPUT_SIZE)
            pred_tensor = PYTORCH_MODEL(x_input)
            pred_scaled_close_price = pred_tensor.item()
            
            prediction_output.append(pred_scaled_close_price)
            
            # Create next day's feature vector (copy last day, update Close_Price)
            next_day_scaled_features = temp_input_np[-1].copy()
            next_day_scaled_features[3] = pred_scaled_close_price
            temp_input_np = np.vstack([temp_input_np, next_day_scaled_features])

        # Inverse transform: (scaled * range) + min
        predictions_actual = (np.array(prediction_output) * close_price_range) + close_price_min
        
        return predictions_actual.flatten().tolist()
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.preprocessing import MinMaxScaler
from typing import List
import traceback
from models import DailyRecord # <--- NEW IMPORT

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
        
        # Initialize hidden and cell states (often done when batch size is dynamic)
        # However, for single inference (batch_size=1), PyTorch handles it well.
        
        out, _ = self.lstm(x)        
        out = self.fc(out[:, -1, :])
        return out

# --- Global Model Loading ---
try:
    PYTORCH_MODEL = LSTMModel(INPUT_SIZE, HIDDEN_SIZE, NUM_LAYERS)
    PYTORCH_MODEL.load_state_dict(torch.load(MODEL_PATH))
    PYTORCH_MODEL.eval() # Set model to evaluation mode
    print(f"PyTorch model '{MODEL_PATH}' loaded successfully.")
except Exception as e:
    PYTORCH_MODEL = None
    print(f"Error loading PyTorch model: {e}")

class PredictionService:
    @staticmethod
    def get_model_status():
        """Checks if the PyTorch model is loaded."""
        return PYTORCH_MODEL is not None

    @staticmethod
    def preprocess_data(historical_data: List[DailyRecord]): 
        """
        Takes raw historical records (List of DailyRecord Pydantic models), 
        computes the 4 features, scales them, and converts them into the required PyTorch tensor.
        """
        
        # 1. Convert List of Pydantic DailyRecord models to a List of raw Python dicts
        # FIX: Explicitly convert Pydantic models to dictionaries before creating DataFrame
        raw_data = [d.model_dump() for d in historical_data] # Pydantic v2 method

        df = pd.DataFrame(raw_data) # Use raw_data now
        df.columns = [str(col).lower() for col in df.columns] 
        
        # 2. Define required keys in lowercase for validation
        required_cols = ['open', 'high', 'low', 'close', 'volume']
    
        # Check if the number of columns matches the expected number (5)
        if len(df.columns) != len(required_cols):
            # This is a critical failure indicating the input data structure is fundamentally wrong
            raise ValueError(
                f"Input data has {len(df.columns)} columns, but 5 columns are required for features."
                f" Please ensure each day's record includes exactly: {required_cols}"
            )
        
        # FORCE the DataFrame to use the standard column names.
        df.columns = required_cols    
        
        # --- FIX: Explicitly convert columns to numeric types to avoid previous TypeError ---
        try:
            for col in ['open', 'high', 'low', 'close']:
                df[col] = pd.to_numeric(df[col], errors='raise')
            df['volume'] = pd.to_numeric(df['volume'], errors='raise').astype(int)
        except Exception as e:
            # Re-raise with a specific error about the nature of the data
            raise ValueError(f"Failed to convert data to numeric types. Check input values. Error: {e}")
        # --- END FIX ---
        
        # Check minimum length (must be >= SEQUENCE_LENGTH + 1 for feature calc)
        if len(df) < SEQUENCE_LENGTH + 1:
            raise ValueError(f"Historical data must be at least {SEQUENCE_LENGTH + 1} days long for feature calculation.")
        # --- CRITICAL VALIDATION END ---

        # 2. Feature Engineering 
        
        # Feature 1: Daily Return (Target for prediction)
        df['Return'] = df['close'].pct_change()
        
        # Feature 2: Daily Range Percentage
        df['Daily_Range'] = (df['high'] - df['low']) / df['close'].shift(1)
        
        # Feature 3: Relative Volume
        df['Avg_Volume'] = df['volume'].rolling(window=SEQUENCE_LENGTH).mean()
        df['Rel_Volume'] = df['volume'] / df['Avg_Volume']

        # Feature 4: Close Price (The raw price is used for the scaling feature)
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
    @torch.no_grad() # Disable gradient calculation for inference (performance boost)
    def predict_future(initial_input_tensor: torch.Tensor, n_days: int, scaler: MinMaxScaler) -> List[float]:
        """Performs multi-day sequence prediction iteratively using PyTorch."""
        
        if PYTORCH_MODEL is None:
            raise RuntimeError("PyTorch model is not available.")

        # Get the initial scaled data (N_hist, 4)
        temp_input_np = initial_input_tensor.flatten(start_dim=1).cpu().numpy().reshape(-1, INPUT_SIZE)
        prediction_output = []
        
        # Get the scaling parameters for the Close_Price column (index 3)
        close_price_min = scaler.data_min_[3]
        close_price_range = scaler.data_range_[3]

        for _ in range(n_days):
            # 1. Prepare input tensor for prediction
            x_input = torch.from_numpy(temp_input_np[-SEQUENCE_LENGTH:]).float().reshape(1, SEQUENCE_LENGTH, INPUT_SIZE)
            
            # 2. Predict the next day's scaled Close_Price (The model's output is 1 element)
            pred_tensor = PYTORCH_MODEL(x_input)
            pred_scaled_close_price = pred_tensor.item() # This is the scaled CLOSE PRICE prediction
            
            prediction_output.append(pred_scaled_close_price)
            
            # 3. Create next day's 4-feature vector for iteration
            # Use a copy of the last day's scaled features for the first 3 (simplification)
            next_day_scaled_features = temp_input_np[-1].copy()
            
            # Replace the last element (Close_Price, index 3) with our prediction
            next_day_scaled_features[3] = pred_scaled_close_price
            
            # Append the new 4-feature vector (scaled) to the sequence
            temp_input_np = np.vstack([temp_input_np, next_day_scaled_features])

        # 4. Inverse transform only the predicted Close_Price values
        # Invert the scaled close price prediction: (scaled * range) + min
        predictions_actual = (np.array(prediction_output) * close_price_range) + close_price_min
        
        return predictions_actual.flatten().tolist()
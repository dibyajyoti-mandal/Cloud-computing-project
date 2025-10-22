import numpy as np
import torch
import torch.nn as nn
from sklearn.preprocessing import MinMaxScaler
from typing import List

# Configuration constants
SEQUENCE_LENGTH = 60
MODEL_PATH = 'lstm_stock_predictor.pt' 
INPUT_SIZE = 1 # We are using only one feature (closing price)
HIDDEN_SIZE = 50 # Must match your training configuration
NUM_LAYERS = 2   # Must match your training configuration

# --- PyTorch Model Definition ---
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
        
        # We only care about the output of the last time step
        out = self.fc(out[:, -1, :])
        return out

# --- Global Model Loading ---
try:
    PYTORCH_MODEL = LSTMModel(INPUT_SIZE, HIDDEN_SIZE, NUM_LAYERS)
    # Load the state dictionary (weights)
    PYTORCH_MODEL.load_state_dict(torch.load(MODEL_PATH))
    PYTORCH_MODEL.eval() # Set model to evaluation mode (important for production)
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
    def preprocess_data(historical_data: List[float]):
        """Scales the data and converts it into the required PyTorch tensor format."""
        
        # 1. Initialize and Fit Scaler
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaler_fit_data = np.array(historical_data).reshape(-1, 1)
        scaler.fit(scaler_fit_data)
        
        # 2. Transform the input data (the last SEQUENCE_LENGTH days)
        input_data = historical_data[-SEQUENCE_LENGTH:]
        scaled_input = scaler.transform(np.array(input_data).reshape(-1, 1))
        
        # 3. Convert to PyTorch Tensor: (samples, time_steps, features)
        # Shape: (1, 60, 1)
        X_input_tensor = torch.from_numpy(scaled_input).float().reshape(1, SEQUENCE_LENGTH, INPUT_SIZE)
        
        return X_input_tensor, scaler

    @staticmethod
    @torch.no_grad() # Disable gradient calculation for inference (performance boost)
    def predict_future(initial_input_tensor: torch.Tensor, n_days: int, scaler: MinMaxScaler) -> List[float]:
        """Performs multi-day sequence prediction iteratively using PyTorch."""
        
        if PYTORCH_MODEL is None:
            raise RuntimeError("PyTorch model is not available.")

        # Get the initial 60 scaled values as a list for easy manipulation
        # Convert tensor (1, 60, 1) -> numpy (60, 1) -> list (60)
        temp_input = initial_input_tensor.flatten().tolist()
        prediction_output = []
        
        for _ in range(n_days):
            # Use the last SEQUENCE_LENGTH values for the next prediction
            # Convert last 60 list items back to PyTorch tensor (1, 60, 1)
            x_input = torch.tensor(temp_input[-SEQUENCE_LENGTH:]).float().reshape(1, SEQUENCE_LENGTH, INPUT_SIZE)
            
            # Predict the next day (scaled)
            pred_tensor = PYTORCH_MODEL(x_input)
            pred_scaled = pred_tensor.item() # Extract the float value
            
            prediction_output.append(pred_scaled)
            
            # Append the prediction to the sequence (the crucial iterative step)
            temp_input.append(pred_scaled)

        # Inverse transform the scaled predictions to get actual prices
        predictions_actual = scaler.inverse_transform(np.array(prediction_output).reshape(-1, 1)).flatten().tolist()
        
        return predictions_actual
from pydantic import BaseModel
from typing import List, Dict, Any

# --- 1. Schema for a Single Day's Record ---
class DailyRecord(BaseModel):
    Open: float
    High: float
    Low: float
    Close: float
    Volume: int

# --- 2. Schema for the Prediction Request Payload ---
class PredictionRequest(BaseModel):
    """Defines the structure for the /predict endpoint request payload."""
    ticker: str
    days: int
    data: List[DailyRecord] 

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "ticker": "TSLA",
                    "days": 7,
                    "data": [
                        # The list must contain at least 60 dictionaries (DailyRecord)
                        { "Open": 250.00, "High": 255.50, "Low": 249.00, "Close": 254.10, "Volume": 45000000 },
                        { "Open": 254.50, "High": 256.00, "Low": 251.00, "Close": 252.80, "Volume": 43000000 },
                        # ... 58 more DailyRecord objects here ...
                        { "Open": 268.00, "High": 270.50, "Low": 265.00, "Close": 269.50, "Volume": 52000000 },
                        { "Open": 269.50, "High": 272.00, "Low": 268.50, "Close": 271.00, "Volume": 51000000 }
                    ] 
                }
            ]
        }
    }

# --- 3. Schema for the Prediction Response ---
class PredictionResponse(BaseModel):
    ticker: str
    days_predicted: int
    predictions: List[float] 
    last_known_price: float
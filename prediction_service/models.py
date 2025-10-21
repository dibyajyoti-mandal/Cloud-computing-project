from pydantic import BaseModel
from typing import List

class PredictionRequest(BaseModel):
    """Defines the structure for the /predict endpoint request payload."""
    ticker: str
    days: int
    data: List[float]  # The historical closing prices (list of floats)

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "ticker": "TSLA",
                    "days": 7,
                    "data": [
                        290.11, 292.05, 291.50, 295.30, 293.70, 296.00, 297.10, 
                        # ... 50 more days of historical closing prices ...
                        301.20, 303.40, 305.10, 304.50, 306.90, 307.25, 308.11 
                    ] 
                }
            ]
        }
    }
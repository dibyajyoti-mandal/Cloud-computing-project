from fastapi import FastAPI, HTTPException, status
from models import PredictionRequest
from prediction_service import PredictionService, SEQUENCE_LENGTH
import traceback
from datetime import datetime, timezone

app = FastAPI(
    title="PyTorch LSTM Stock Prediction API",
    description="Microservice for multi-day stock price forecasting using a pre-trained PyTorch LSTM model."
)

# Initialize service/load model when app starts
PredictionService = PredictionService()
PredictionService.get_model_status()


@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """
    Health check endpoint to verify the service is running.
    """
    return {
        "status": "healthy",
        "service": "PyTorch LSTM Stock Prediction API",
        "model_loaded": PredictionService.get_model_status(),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.post("/predict", status_code=status.HTTP_200_OK)
async def predict_stock_price(request_data: PredictionRequest):
    """
    Receives historical data and predicts future stock prices.
    """
    
    # Check model status
    if not PredictionService.get_model_status():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not loaded. Check server logs for load error."
        )

    # Manual validation for data length
    if len(request_data.data) < SEQUENCE_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Historical data must contain at least {SEQUENCE_LENGTH} days. Found {len(request_data.data)}."
        )

    # 1. Preprocess Data
    try:
        # X_input is now a PyTorch tensor
        X_input_tensor, scaler = PredictionService.preprocess_data(request_data.data)
        
    except Exception as e:
        print(f"Error during preprocessing: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Data preprocessing failed on the server."
        )

    # 2. Perform Prediction
    try:
        predicted_prices = PredictionService.predict_future(
            X_input_tensor, 
            request_data.days, 
            scaler
        )
        
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except Exception as e:
        print(f"Error during prediction: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Prediction execution failed."
        )

    # 3. Return Results
    last_known_close_price = request_data.data[-1].Close # FIX: Extract 'Close' price as float
    
    return {
        "ticker": request_data.ticker,
        "days_predicted": request_data.days,
        "predictions": predicted_prices,
        "last_known_price": last_known_close_price
    }

# --- Run server using ---
# uvicorn main:app --reload --host 0.0.0.0 --port 8000
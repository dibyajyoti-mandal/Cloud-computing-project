from fastapi import FastAPI, HTTPException, status
from models import PredictionRequest
from prediction_service import PredictionService, SEQUENCE_LENGTH
import traceback
from datetime import datetime, timezone
import yfinance as yf
import pandas as pd

app = FastAPI(
    title="PyTorch LSTM Stock Prediction API",
    description="Microservice for multi-day stock price forecasting using a pre-trained PyTorch LSTM model."
)

REQUIRED_RAW_DAYS = 119
YF_PERIOD = '120d'
# Initialize service/load model when app starts
PredictionService = PredictionService()
PredictionService.get_model_status()

@app.get("/stock/{ticker}", status_code=status.HTTP_200_OK)
async def get_stock_data(ticker: str):
    """
    Fetches the last 119 days of historical stock data needed for prediction
    and returns it as a list of dictionaries.
    """
    ticker_upper = ticker.upper()
    
    try:
        # 1. Fetch data
        df = yf.download(ticker_upper, period=YF_PERIOD, progress=False)

        if df.empty:
             raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stock ticker '{ticker_upper}' not found or no data available for the period."
            )

        # 2. Flatten MultiIndex Columns
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.droplevel(1)

        # 3. Select columns and ensure PascalCase naming (matches DailyRecord model)
        df = df[['Open', 'High', 'Low', 'Close', 'Volume']]

        # 4. Extract the last required number of records
        historical_data_df = df.tail(REQUIRED_RAW_DAYS)

        if len(historical_data_df) < REQUIRED_RAW_DAYS:
             # Raise a warning if not enough data was found, but still return what we have
             print(f"Warning: Only {len(historical_data_df)} days retrieved, expected {REQUIRED_RAW_DAYS}.")

        # 5. Convert to list of dictionaries (records format)
        historical_data_list = historical_data_df.to_dict('records')
        
        return historical_data_list

    except Exception as e:
        print(f"Error fetching historical stock data for {ticker_upper}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch historical stock data for {ticker_upper}."
        )

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

    if len(request_data.data) < SEQUENCE_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Historical data must contain at least {SEQUENCE_LENGTH} days. Found {len(request_data.data)}."
        )

    # 1. Preprocess Data
    try:
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
    last_known_close_price = request_data.data[0].Close # FIX: Extract 'Close' price as float
    
    return {
        "ticker": request_data.ticker,
        "days_predicted": request_data.days,
        "predictions": predicted_prices,
        "last_known_price": last_known_close_price
    }

# uvicorn main:app --reload --host 0.0.0.0 --port 8000
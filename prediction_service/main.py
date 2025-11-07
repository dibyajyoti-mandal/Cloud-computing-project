import json
from fastapi import FastAPI, HTTPException, status
from models import PredictionRequest
from prediction_service import PredictionService, SEQUENCE_LENGTH
import traceback
from datetime import datetime, timezone
import yfinance as yf
import pandas as pd
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(
    title="PyTorch LSTM Stock Prediction API",
    description="Microservice for multi-day stock price forecasting using a pre-trained PyTorch LSTM model."
)

# --- AWS S3 Configuration from Environment Variables ---
# NOTE: Ensure these are set in your environment (e.g., in a .env file or deployment script)
S3_BUCKET_NAME = os.environ.get("S3_BUCKET_NAME", "flaskapps3bucketdmandal")
AWS_REGION = os.environ.get("AWS_REGION", "ap-south-1")
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")

try:
    if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY:
        # FIX: Raise a standard Python ValueError instead of botocore.exceptions.NoCredentialsError
        raise ValueError("AWS credentials environment variables (AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY) are not set.")

    S3_CLIENT = boto3.client(
        's3', 
        region_name=AWS_REGION,
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY
    )
    print(f"S3 client initialized for bucket: {S3_BUCKET_NAME} in region: {AWS_REGION}")

# Catch a generic Python exception now, which will also catch the ValueError raised above
# and any botocore exceptions raised during client instantiation.
except Exception as e: 
    S3_CLIENT = None
    print(f"WARNING: S3 Client could not be initialized. Caching will be skipped. Error: {e}")

REQUIRED_RAW_DAYS = 119
YF_PERIOD = '120d'
# Initialize service/load model when app starts
PredictionService = PredictionService()
PredictionService.get_model_status()


# Helper function to process data consistently
def process_yfinance_data(df: pd.DataFrame, ticker_upper: str) -> list:
    """Processes yfinance DataFrame into a list of DailyRecord dictionaries."""
    
    # 1. Flatten MultiIndex Columns
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.droplevel(1)

    # 2. Select columns and ensure PascalCase naming (matches DailyRecord model)
    df = df[['Open', 'High', 'Low', 'Close', 'Volume']]

    # 3. Extract the last required number of records
    historical_data_df = df.tail(REQUIRED_RAW_DAYS)

    if len(historical_data_df) < REQUIRED_RAW_DAYS:
         print(f"Warning: Only {len(historical_data_df)} days retrieved for {ticker_upper}, expected {REQUIRED_RAW_DAYS}.")

    # 4. Convert to list of dictionaries (records format)
    return historical_data_df.to_dict('records')

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

@app.get("/stock/{ticker}", status_code=status.HTTP_200_OK)
async def get_stock_data(ticker: str):
    """
    Checks S3 cache for {ticker}.json. If not found, fetches from yfinance, 
    caches to S3, and returns the last 119 days of historical data.
    """
    ticker_upper = ticker.upper()
    s3_key = f"data/{ticker_upper}.json" # Use a prefix for organization

    # 1. --- Check S3 Cache (If client initialized) ---
    if S3_CLIENT:
        try:
            S3_CLIENT.head_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
            
            # File found in S3, download it
            print(f"Cache hit: Retrieving {s3_key} from S3.")
            response = S3_CLIENT.get_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
            data_json = response['Body'].read().decode('utf-8')
            historical_data_list = json.loads(data_json)
            
            return historical_data_list

        except ClientError as e:
            if e.response['Error']['Code'] != '404':
                # Re-raise error if it's not a simple 'not found'
                print(f"S3 ClientError (non-404): {e}")
                pass # Proceed to yfinance fetch
            print(f"Cache miss: {s3_key} not found in S3. Proceeding to fetch.")
        
        except Exception as e:
            print(f"Error reading or decoding data from S3: {e}. Refetching.")


    # 2. --- Fetch from yfinance (Cache Miss or S3 Failed) ---
    try:
        df = yf.download(ticker_upper, period=YF_PERIOD, progress=False)

        if df.empty:
             raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stock ticker '{ticker_upper}' not found or no data available for the period."
            )

        historical_data_list = process_yfinance_data(df, ticker_upper)
        
        # 3. --- Store Data to S3 Cache (If client initialized) ---
        if S3_CLIENT:
            try:
                data_json = json.dumps(historical_data_list)
                S3_CLIENT.put_object(
                    Bucket=S3_BUCKET_NAME,
                    Key=s3_key,
                    Body=data_json,
                    ContentType='application/json'
                )
                print(f"Successfully cached {s3_key} to S3.")
            except Exception as e:
                print(f"Failed to cache data to S3: {e}")
        
        return historical_data_list

    except HTTPException:
        raise
    except Exception as e:
        print(f"Fatal error fetching data for {ticker_upper}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch stock data for {ticker_upper}."
        )

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
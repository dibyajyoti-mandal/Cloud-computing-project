# Cloud-Comp Backend

A microservices architecture with two backend services:
1. **Node.js (Express) API Gateway** - Lightweight proxy service with authentication
2. **Python FastAPI ML Service** - PyTorch LSTM model for stock price prediction

## Architecture Overview

```
Client Request → Node.js Gateway (Port 3000) → Python ML Service (Port 8000)
```

The Node.js service handles authentication and proxies requests to the Python FastAPI service that runs the machine learning model.

## Prerequisites

### Node.js Service
- Node.js 18+
- npm

### Python ML Service  
- Python 3.8+
- pip
- PyTorch-compatible system (CPU/GPU)

## Getting Started

### 1. Node.js API Gateway Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables (recommended via a local `.env` you do NOT commit):
- `FLASK_INFERENCE_URL` (required in real deployments): URL to the Python ML service endpoint.
- `API_KEY` (required): API key required via `X-API-KEY` header.

If not set, defaults are used in `index.js` for local development:
- `FLASK_INFERENCE_URL` -> `http://localhost:5000/forecast`
- `API_KEY` -> `your-super-secret-key-12345`

3. Start the Node.js server:
```bash
npm start
```
The server listens on port `3000` by default.

### 2. Python ML Service Setup

1. Navigate to the prediction service directory:
```bash
cd prediction_service
```

2. Create and activate a virtual environment:
```bash
python -m venv cc
# Windows
cc\Scripts\activate
# Linux/Mac
source cc/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start the FastAPI service:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
The service listens on port `8000` by default.

### 3. Running Both Services

Start both services in separate terminals:
```bash
# Terminal 1: Node.js Gateway
npm start

# Terminal 2: Python ML Service  
cd prediction_service
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Project Structure
```
# Node.js API Gateway
handlers/
  dummyHandler.js           # Health check handler
  predictionHandler.js      # Prediction request handler
routes/
  dummyRouter.js            # /health router
  predictionRouter.js       # /api/predict router
index.js                    # App entrypoint and middleware

# Python ML Service
prediction_service/
  main.py                   # FastAPI app with endpoints
  models.py                 # Pydantic request/response models
  prediction_service.py     # PyTorch LSTM model and prediction logic
  requirements.txt          # Python dependencies
  cc/                       # Virtual environment directory
```

## Environment Variables

### Node.js Service
- `FLASK_INFERENCE_URL`: Full URL of Python ML service endpoint (e.g., `http://localhost:8000/predict`).
- `API_KEY`: Secret used to authorize requests. Client must send `X-API-KEY` header.

### Python ML Service
- `S3_BUCKET_NAME`: AWS S3 bucket name for caching stock data (default: "flaskapps3bucketdmandal")
- `AWS_REGION`: AWS region for S3 operations (default: "ap-south-1")
- `AWS_ACCESS_KEY_ID`: AWS access key ID (required for S3 caching)
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key (required for S3 caching)
- Model files (`lstm_stock_predictor.pt`) should be present in the prediction_service directory

## API Documentation

### Node.js API Gateway Endpoints

#### Health Check (Public)
- **Method**: GET
- **Path**: `/health`
- **Response**: `200 OK`
```json
{ 
  "message": "Service status : Running", 
  "timestamp": "2025-01-01T00:00:00.000Z" 
}
```

#### Predict (Protected)
- **Method**: POST
- **Path**: `/api/predict`
- **Headers**:
  - `Content-Type: application/json`
  - `X-API-KEY: <your-api-key>`
- **Body**:
```json
{ 
  "ticker": "AAPL", 
  "days": 5
}
```
**Note**: The historical data is automatically fetched from the FastAPI service's `/stock/{ticker}` endpoint. No need to provide `data` in the request.
- **Success Response**: `200 OK`
```json
{
  "ticker": "AAPL",
  "predictionDays": 5,
  "predictions": [123.4, 124.1, 125.0, 123.9, 124.7],
  "lastKnownPrice": 293.70,
  "message": "Prediction successfully retrieved from ML service."
}
```
- **Possible Errors**:
  - `400` Validation Error (missing/invalid `ticker`, `days`, or `data`)
  - `401` Unauthorized (missing/invalid `X-API-KEY`)
  - `503` Service Unavailable (Python ML service unreachable)
  - `500` Internal Server Error (unexpected failure)

### Python ML Service Endpoints (Direct Access)

#### Health Check
- **Method**: GET
- **Path**: `/health`
- **Response**: `200 OK`
```json
{
  "status": "healthy",
  "service": "PyTorch LSTM Stock Prediction API",
  "model_loaded": true,
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

#### Get Stock Historical Data
- **Method**: GET
- **Path**: `/stock/{ticker}`
- **Response**: `200 OK`
Returns an array of the last 119 days of historical stock data (cached in S3 when available):
```json
[
  {
    "Open": 250.00,
    "High": 255.50,
    "Low": 249.00,
    "Close": 254.10,
    "Volume": 45000000
  },
  {
    "Open": 254.50,
    "High": 256.00,
    "Low": 251.00,
    "Close": 252.80,
    "Volume": 43000000
  },
  ...
]
```
**Note**: Data is returned in reverse chronological order (most recent first) and is automatically reversed during preprocessing.

#### Predict (Direct)
- **Method**: POST
- **Path**: `/predict`
- **Headers**:
  - `Content-Type: application/json`
- **Body**:
```json
{
  "ticker": "AAPL",
  "days": 5,
  "data": [
    {
      "Open": 250.00,
      "High": 255.50,
      "Low": 249.00,
      "Close": 254.10,
      "Volume": 45000000
    },
    {
      "Open": 254.50,
      "High": 256.00,
      "Low": 251.00,
      "Close": 252.80,
      "Volume": 43000000
    },
    ...
  ]
}
```
**Note**: The `data` array must contain at least 60 `DailyRecord` objects (Open, High, Low, Close, Volume). Historical data received in reverse order is automatically reversed during preprocessing.
- **Success Response**: `200 OK`
```json
{
  "ticker": "AAPL",
  "days_predicted": 5,
  "predictions": [123.4, 124.1, 125.0, 123.9, 124.7],
  "last_known_price": 293.70
}
```
- **Possible Errors**:
  - `400` Bad Request (insufficient historical data)
  - `503` Service Unavailable (model not loaded)
  - `500` Internal Server Error (prediction failure)

## cURL Examples

### Node.js Gateway (Recommended)

Health check:
```bash
curl -s http://localhost:3000/health
```

Predict via gateway (replace API key):
```bash
curl -s -X POST http://localhost:3000/api/predict \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-super-secret-key-12345" \
  -d '{
    "ticker": "AAPL",
    "days": 5
  }'
```

### Python ML Service (Direct)

Health check:
```bash
curl -s http://localhost:8000/health
```

Get stock historical data:
```bash
curl -s http://localhost:8000/stock/AAPL
```

Predict directly:
```bash
curl -s -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "AAPL", 
    "days": 5,
    "data": [
      {"Open": 250.00, "High": 255.50, "Low": 249.00, "Close": 254.10, "Volume": 45000000},
      {"Open": 254.50, "High": 256.00, "Low": 251.00, "Close": 252.80, "Volume": 43000000}
    ]
  }'
```

## Technical Notes

### Node.js Service
- Uses ES Modules (`"type": "module"` in `package.json`). Import syntax is `import ... from '...'`.
- `.gitignore` excludes `node_modules/` and `.env`. Ensure secrets are never committed.
- Increase Axios timeout or add retries in `handlers/predictionHandler.js` if your ML service is slow.

### Python ML Service
- Uses FastAPI with automatic OpenAPI documentation at `http://localhost:8000/docs`
- PyTorch LSTM model requires sufficient historical data (minimum 60 days)
- Model loading happens at startup - check logs for any model loading errors
- Virtual environment (`cc/`) should not be committed to version control
- Integrates with AWS S3 for caching historical stock data
- Historical data fetched via yfinance is automatically cached to S3 for faster subsequent requests

### Data Requirements
- Historical data must contain at least 60 days of DailyRecord objects (Open, High, Low, Close, Volume)
- Data is automatically reversed during preprocessing if received in reverse chronological order
- More historical data generally leads to better predictions
- The service automatically fetches the last 119 days of data when using the `/stock/{ticker}` endpoint

### Environment Variables (Python ML Service)
- `S3_BUCKET_NAME`: AWS S3 bucket name for caching (default: "flaskapps3bucketdmandal")
- `AWS_REGION`: AWS region for S3 (default: "ap-south-1")
- `AWS_ACCESS_KEY_ID`: AWS access key ID (required)
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key (required)

### Deployment Considerations
- Both services can be containerized independently
- Consider using a reverse proxy (nginx) for production
- Monitor model performance and retrain periodically
- Use environment variables for production configuration

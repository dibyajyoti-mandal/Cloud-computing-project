# Cloud-Comp Backend

A lightweight Node.js (Express) backend that proxies prediction requests to a Flask ML inference service. Uses modern ES Modules (import/export).

## Prerequisites
- Node.js 18+
- npm
- Running Flask inference service exposing a POST endpoint that accepts `{ ticker, days }` and returns `{ prediction: number[] }`.

## Getting Started
1. Install dependencies:
```bash
npm install
```

2. Configure environment variables (recommended via a local `.env` you do NOT commit):
- `FLASK_INFERENCE_URL` (required in real deployments): URL to the Flask prediction endpoint.
- `API_KEY` (required): API key required via `X-API-KEY` header.

If not set, defaults are used in `index.js` for local development:
- `FLASK_INFERENCE_URL` -> `http://localhost:5000/forecast`
- `API_KEY` -> `your-super-secret-key-12345`

3. Start the server:
```bash
npm start
```
The server listens on port `3000` by default.

## Project Structure
```
handlers/
  dummyHandler.js           # Health check handler
  predictionHandler.js      # Prediction request handler
routes/
  dummyRouter.js            # /health router
  predictionRouter.js       # /api/predict router
index.js                    # App entrypoint and middleware
```

## Environment Variables
- `FLASK_INFERENCE_URL`: Full URL of Flask inference endpoint (e.g., `http://localhost:5000/forecast`).
- `API_KEY`: Secret used to authorize requests. Client must send `X-API-KEY` header.

## API
### Health Check (Public)
- Method: GET
- Path: `/health`
- Response: `200 OK`
```json
{ "message": "Service status : Running", "timestamp": "2025-01-01T00:00:00.000Z" }
```

### Predict (Protected)
- Method: POST
- Path: `/api/predict`
- Headers:
  - `Content-Type: application/json`
  - `X-API-KEY: <your-api-key>`
- Body:
```json
{ "ticker": "AAPL", "days": 5 }
```
- Success Response: `200 OK`
```json
{
  "ticker": "AAPL",
  "predictionDays": 5,
  "predictions": [123.4, 124.1, 125.0, 123.9, 124.7],
  "message": "Prediction successfully retrieved from ML service."
}
```
- Possible Errors:
  - `400` Validation Error (missing/invalid `ticker` or `days`)
  - `401` Unauthorized (missing/invalid `X-API-KEY`)
  - `503` Service Unavailable (Flask service unreachable)
  - `500` Internal Server Error (unexpected failure)

## cURL Examples
Health:
```bash
curl -s http://localhost:3000/health
```

Predict (replace API key):
```bash
curl -s -X POST http://localhost:3000/api/predict \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-super-secret-key-12345" \
  -d '{"ticker":"AAPL","days":5}'
```

## Notes
- This project uses ES Modules (`"type": "module"` in `package.json`). Import syntax is `import ... from '...'`.
- `.gitignore` excludes `node_modules/` and `.env`. Ensure secrets are never committed.
- Increase Axios timeout or add retries in `handlers/predictionHandler.js` if your ML service is slow.

// index.js (CLEANED AND FINALIZED)
import express from 'express';
import helloRouter from './routes/dummyRouter.js'
import predictionRouter from './routes/predictionRouter.js';
import stockRouter from './routes/stockRouter.js'; // <--- NEW IMPORT
import dotenv from 'dotenv'; 

dotenv.config();

// Note: FASTAPI_HEALTH_URL is used as the base for the stock service (http://localhost:8000)
const FLASK_INFERENCE_URL = process.env.FLASK_INFERENCE_URL || 'http://localhost:8000/predict'; 
const FASTAPI_HEALTH_URL = process.env.FASTAPI_HEALTH_URL || 'http://localhost:8000/health'; 
const API_KEY = process.env.API_KEY || 'your-super-secret-key-12345'; 
const PORT = 3000;

const app = express();

app.use(express.json());

// Set both URLs in the app settings
app.set('flaskInferenceUrl', FLASK_INFERENCE_URL);
app.set('fastapiHealthUrl', FASTAPI_HEALTH_URL); 

// Middleware for API Key Authorization
const authorizeAPIKey = (req, res, next) => {
    const receivedKey = req.header('X-API-KEY');
    
    // Note: We are NOT authorizing the /stock endpoint, assuming it's public data
    if (receivedKey && receivedKey === API_KEY) {
        next();
    } else {
        console.warn('Unauthorized request attempt.');
        res.status(401).send({ 
            error: 'Unauthorized', 
            message: 'A valid X-API-KEY is required to access this endpoint.' 
        });
    }
};


// Routes

app.get('/', (req, res) => {
    res.send('Server is running. Access the main endpoint at /api/predict (requires X-API-KEY).');
});

app.use('/health', helloRouter);
app.use('/api/stock', stockRouter); 
app.use('/api/predict', predictionRouter);

//app.use('/stock', stockRouter); // <--- New /stock/:ticker route is publicly accessible

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
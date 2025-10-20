import express from 'express';
import helloRouter from './routes/dummyRouter.js'
import predictionRouter from './routes/predictionRouter.js'; // Import the prediction router

// --- Configuration Constants ---

// IMPORTANT: In a real deployment, these MUST be loaded from environment variables!
const FLASK_INFERENCE_URL = process.env.FLASK_INFERENCE_URL || 'http://localhost:5000/forecast'; 
const API_KEY = process.env.API_KEY || 'your-super-secret-key-12345'; 
const PORT = 3000;

// Initialize the Express application
const app = express();

// --- Application Configuration ---

// Middleware to parse incoming JSON payloads (body parser)
app.use(express.json());

// Set Inference URL globally so handlers can access it
app.set('flaskInferenceUrl', FLASK_INFERENCE_URL);

// --- Middleware for API Key Authorization ---
const authorizeAPIKey = (req, res, next) => {
    const receivedKey = req.header('X-API-KEY');
    
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


// --- Routes ---

// Simple root route
app.get('/', (req, res) => {
    res.send('Server is running. Access the main endpoint at /api/predict (requires X-API-KEY).');
});

// Public Health Check
app.use('/health', helloRouter);

// Protected prediction route: /api/predict
// NOTE: We apply authorization middleware before the router
app.use('/api', authorizeAPIKey, predictionRouter); 


// --- Server Startup ---

// Start the server listening on the specified port
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

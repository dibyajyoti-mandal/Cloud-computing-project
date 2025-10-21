import express from 'express';
import { handlePredictionRequest } from '../handlers/predictionHandler.js';

const router = express.Router();

/**
 * Route: POST /api/predict
 * Uses the handlePredictionRequest function to process the ML prediction.
 */
router.post('/predict', handlePredictionRequest);

export default router;

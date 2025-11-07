import express from 'express';
import { handlePredictionRequest } from '../handlers/predictionHandler.js';

const router = express.Router();

/**
 * Route: POST /
 * This path is combined with the '/api/predict' from index.js
 * to create the final route: POST /api/predict
 */
router.post('/', handlePredictionRequest);

export default router;
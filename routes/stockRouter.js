// routes/stockRouter.js (UPDATED)
import express from 'express';
import { getStockClosingPrices } from '../handlers/stockHandler.js'; 

const router = express.Router();

/**
 * Route: GET /stock/:ticker
 * Proxies request to FastAPI to fetch and return a list of historical closing prices.
 */
router.get('/:ticker', getStockClosingPrices);

export default router;
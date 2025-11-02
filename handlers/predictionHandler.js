import axios from 'axios';    
/**
 * Handles the prediction request by:
 * 1. Fetching the last 119 days of full historical data from FastAPI's /stock/{ticker} endpoint.
 * 2. Constructing the final prediction payload with the historical data.
 * 3. Calling the FastAPI /predict endpoint.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
export const handlePredictionRequest = async (req, res) => {
    // Get URLs from the app settings
    const flaskInferenceUrl = req.app.get('flaskInferenceUrl'); // This is the FastAPI /predict URL
    const fastapiHealthUrl = req.app.get('fastapiHealthUrl');   // Used to derive the FastAPI base URL
    const fastapiBaseUrl = fastapiHealthUrl.replace('/health', '');

    const { ticker, days } = req.body;
    const tickerUpper = ticker.toUpperCase();

    // --- 1. Input Validation ---
    if (!ticker || !days) {
        return res.status(400).json({ 
            error: 'Validation Error', 
            message: 'The request body must contain "ticker" and "days".' 
        });
    }
    if (typeof days !== 'number' || days < 1 || days > 30) {
        return res.status(400).json({ 
            error: 'Validation Error', 
            message: 'Days must be a number between 1 and 30.' 
        });
    }

    let historicalData;
    
    // --- 2. Call FastAPI to GET Historical Data ---
    const fastapiStockUrl = `${fastapiBaseUrl}/stock/${tickerUpper}`;
    
    try {
        console.log(`Fetching historical data from: ${fastapiStockUrl}`);
        const historyResponse = await axios.get(fastapiStockUrl, { timeout: 10000 });
        historicalData = historyResponse.data; // This should be the list of 119 DailyRecord objects
        
        // Manual check for data structure consistency
        if (!Array.isArray(historicalData) || historicalData.length < 119) {
             throw new Error("FastAPI did not return the required 119 days of historical data.");
        }

    } catch (error) {
        console.error('Error fetching historical data from FastAPI:', error.message);
        
        // Handle network/connection errors or data unavailability from FastAPI /stock
        if (axios.isAxiosError(error) && error.response) {
            return res.status(error.response.status).json({
                error: 'Upstream Data Fetch Error',
                message: error.response.data.detail || `FastAPI stock data service returned status ${error.response.status}.`
            });
        }
        
        return res.status(503).json({ 
            error: 'Service Unavailable', 
            message: 'Failed to fetch required historical data from FastAPI.' 
        });
    }
    
    // --- 3. Construct and Call the FastAPI /predict Endpoint ---
    const requestPayload = {
        ticker: tickerUpper,
        days: days, 
        data: historicalData // Pass the full historical records array
    };

    try {
        console.log(`Sending prediction request to: ${flaskInferenceUrl}`);
        
        const response = await axios.post(
            flaskInferenceUrl, 
            requestPayload,
            { timeout: 30000 } // Set a generous timeout for the ML model
        );

        // --- 4. Process and Return Response ---
        // Assuming the FastAPI server returns { ticker, days_predicted, predictions, last_known_price }
        res.status(200).json({
            ticker: tickerUpper,
            predictionDays: days,
            predictions: response.data.predictions, 
            lastKnownPrice: response.data.last_known_price,
            message: 'Prediction successfully retrieved from ML service.'
        });

    } catch (error) {
        console.error('Error calling FastAPI /predict service:', error.message);
        
        if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
            return res.status(503).json({ 
                error: 'Service Unavailable', 
                message: 'The ML prediction service is currently unreachable.' 
            });
        }
        
        res.status(500).json({ 
            error: 'Internal Server Error', 
            message: 'An unexpected error occurred during prediction processing.' 
        });
    }
};
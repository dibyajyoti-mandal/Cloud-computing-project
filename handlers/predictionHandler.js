import axios from 'axios';

/**
 * Handles the prediction request by validating input, constructing the payload,
 * calling the Flask inference service, and formatting the final response.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
export const handlePredictionRequest = async (req, res) => {
    // Get the Flask URL set in the main app.js (via app.set/req.app.get)
    const flaskInferenceUrl = req.app.get('flaskInferenceUrl');
    const { ticker, days } = req.body;

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
    
    // Construct the payload for the Flask service
    const requestPayload = {
        ticker: ticker.toUpperCase(),
        days: days,
        // When integrating S3, the Node.js backend would fetch the 60-day 
        // historical data CSV for 'ticker' from S3 here, parse it, and 
        // include the data array in this payload.
    };

    try {
        // --- 2. Call the Flask Inference Server (Axios) ---
        const response = await axios.post(
            flaskInferenceUrl, 
            requestPayload,
            { timeout: 15000 } // Set a generous timeout for the ML model
        );

        // --- 3. Process and Return Response ---
        // Assuming the Flask server returns { prediction: [...] }
        res.status(200).json({
            ticker: ticker.toUpperCase(),
            predictionDays: days,
            predictions: response.data.prediction, 
            message: 'Prediction successfully retrieved from ML service.'
        });

    } catch (error) {
        console.error('Error calling Flask service:', error.message);
        
        // Handle network/connection errors
        if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
            return res.status(503).json({ 
                error: 'Service Unavailable', 
                message: 'The ML prediction service is currently unreachable.' 
            });
        }
        
        // Handle other internal errors (e.g., Flask server returned 500)
        res.status(500).json({ 
            error: 'Internal Server Error', 
            message: 'An unexpected error occurred during prediction processing.' 
        });
    }
};

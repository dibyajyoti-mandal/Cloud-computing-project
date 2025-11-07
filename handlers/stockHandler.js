// handlers/stockHandler.js
import axios from 'axios';

/**
 * Proxies the request to the FastAPI /stock/{ticker} endpoint,
 * fetches the historical data list (119 days), and filters it
 * to return only the 'Close' prices.
 *
 * @param {object} req 
 * @param {object} res
 */
export const getStockClosingPrices = async (req, res) => {
    const { ticker } = req.params;
    // Get the FastAPI base URL from the app settings
    const fastapiBaseUrl = req.app.get('fastapiHealthUrl').replace('/health', '');
    const fastapiStockUrl = `${fastapiBaseUrl}/stock/${ticker}`;
    
    console.log(`Proxying stock data request to: ${fastapiStockUrl}`);

    try {
        // --- 1. Call the FastAPI Service ---
        const response = await axios.get(fastapiStockUrl, { timeout: 10000 });

        // FastAPI is expected to return a list of DailyRecord objects:
        // [{"Open": ..., "High": ..., "Close": 270.369, "Volume": ...}, ...]
        const historicalDataList = response.data;

        // --- 2. Filter for Closing Prices Only ---
        if (!Array.isArray(historicalDataList) || historicalDataList.length === 0) {
            return res.status(404).json({
                error: 'Data Not Found',
                message: `No historical data retrieved from FastAPI for ticker: ${ticker.toUpperCase()}`
            });
        }
        
        const closingPrices = historicalDataList.map(record => record.Close);

        // --- 3. Return Filtered Data ---
        res.status(200).json({
            ticker: ticker.toUpperCase(),
            data_points: closingPrices.length,
            data: historicalDataList,
            message: `Successfully retrieved and filtered ${closingPrices.length} closing prices.`
        });

    } catch (error) {
        console.error(`Error proxying stock request to FastAPI: ${error.message}`);
        
        if (axios.isAxiosError(error) && error.response) {
            // Forward relevant error status/details from FastAPI
            return res.status(error.response.status).json({
                error: 'FastAPI Error',
                message: error.response.data.detail || `FastAPI returned status ${error.response.status}`
            });
        }
        
        // Handle network/connection errors
        res.status(503).json({ 
            error: 'Service Unavailable', 
            message: 'Could not reach the FastAPI stock data service.' 
        });
    }
};
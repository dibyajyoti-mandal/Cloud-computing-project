import axios from 'axios';


/**
 * Performs a cascading health check: 
 * 1. Checks Express service status.
 * 2. Checks FastAPI service status (/health).
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */

export const getHealth = async (req, res) => {
    const fastapiHealthUrl = req.app.get('fastapiHealthUrl'); // Get the URL from the app settings
    
    // --- 1. Express Service Status ---
    const expressStatus = {
        service: 'Express Gateway',
        status: 'running',
        timestamp: new Date().toISOString()
    };
    
    // --- 2. FastAPI and Model Status Check ---
    let fastapiStatus = {
        service: 'FastAPI Prediction Service',
        status: 'unreachable',
        model_loaded: false
    };

    try {
        const response = await axios.get(fastapiHealthUrl, { timeout: 5000 });
        
        // Assuming FastAPI returns status 200 and a JSON body like:
        // { "status": "healthy", "model_loaded": true, ... }
        
        fastapiStatus = {
            service: 'FastAPI Prediction Service',
            status: response.data.status,
            model_loaded: response.data.model_loaded,
            fastapi_timestamp: response.data.timestamp
        };

    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            // FastAPI responded but with an error status (e.g., 503)
            fastapiStatus.status = `error (${error.response.status})`;
            if (error.response.data && error.response.data.model_loaded !== undefined) {
                 fastapiStatus.model_loaded = error.response.data.model_loaded;
            }
        } else if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
            // Connection failure
            fastapiStatus.status = 'unreachable (ECONNREFUSED)';
        } else {
            // Other network error or timeout
            fastapiStatus.status = `network error: ${error.message}`;
        }
    }
    const isExpressHealthy = expressStatus.status === 'running';
    const isFastAPIHealthy = fastapiStatus.status === 'healthy';
    const isModelLoaded = fastapiStatus.model_loaded === true;
    
    const overallStatus = (isExpressHealthy && isFastAPIHealthy && isModelLoaded) ? 'GOOD' : 'BAD';
    const statusCode = (isExpressHealthy && isFastAPIHealthy && isModelLoaded) ? 200 : 503;

    res.status(statusCode).json({
        overall_status: overallStatus,
        details: {
            express_gateway: expressStatus,
            fastapi_service: fastapiStatus
        },
        message: overallStatus === 'GOOD' ? 'All services and dependencies are operational.' : 'A critical service or dependency is degraded.'
    });
};

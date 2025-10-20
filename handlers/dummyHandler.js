/**
 * Controller function (handler) for the /health endpoint.
 * This function contains the actual business logic.
 */
export const getHealth = (req, res) => {
    // Send a 200 OK response with a JSON body
    res.status(200).json({
        message: 'Service statud : Running',
        timestamp: new Date().toISOString()
    });
};

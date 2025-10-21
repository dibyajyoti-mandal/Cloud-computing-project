export const getHealth = (req, res) => {
    res.status(200).json({
        message: 'Service status : Running',
        timestamp: new Date().toISOString()
    });
};

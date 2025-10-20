import express from 'express';
import helloRouter from './routes/dummyRouter.js'

// Initialize the Express application
const app = express();
const PORT = 3000;

// --- Application Configuration ---

// Middleware to parse incoming JSON payloads (body parser)
app.use(express.json());
app.use('/health', helloRouter);

// Simple root route
app.get('/', (req, res) => {
    res.send('Server is running. Access the main endpoint at /hello');
});

// --- Server Startup ---

// Start the server listening on the specified port
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

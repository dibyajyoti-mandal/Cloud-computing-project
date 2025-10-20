// dummyRouter.js
import express from 'express';
// Import the controller functions (handlers)
import { getHealth } from '../handlers/dummyHandler.js';

// Create a new router instance
const router = express.Router();

router.get('/', getHealth);

export default router;

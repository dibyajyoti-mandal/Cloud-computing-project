// dummyRouter.js
import express from 'express';
import { getHealth } from '../handlers/dummyHandler.js';

const router = express.Router();

router.get('/', getHealth);

export default router;

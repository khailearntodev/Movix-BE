import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { generateAccessToken } from '../controllers/livekit.controller';

const router = Router();

//Get token for livekit
router.get('/generate-liveToken', authenticateToken, generateAccessToken);

export default router;
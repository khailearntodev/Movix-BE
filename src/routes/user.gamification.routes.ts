import { Router } from 'express';
import { getMyGamificationProfile } from '../controllers/user.gamification.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/profile', authenticateToken, getMyGamificationProfile);

export default router;

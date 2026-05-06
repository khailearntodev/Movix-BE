import { Router } from 'express';
import { getMyGamificationProfile, getAllAvailableAchievements } from '../controllers/user.gamification.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/profile', authenticateToken, getMyGamificationProfile);
router.get('/achievements', authenticateToken, getAllAvailableAchievements);

export default router;

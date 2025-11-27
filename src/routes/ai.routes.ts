import { Router } from 'express';
import * as aiController from '../controllers/ai.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.post('/chat', authenticateToken, aiController.chat);
router.post('/search', aiController.searchMovies);

export default router;
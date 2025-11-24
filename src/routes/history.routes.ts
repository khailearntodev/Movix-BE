import { Router } from 'express';
import { historyController } from '../controllers/history.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/sync', historyController.syncProgress);
router.get('/', historyController.getMyHistory);

export default router;
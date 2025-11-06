import express from 'express';
import * as userController from '../controllers/user.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = express.Router();

router.use(authenticateToken);

router.get('/me', userController.getMyProfile);
router.put('/me', userController.updateMyProfile);
router.post('/change-password', userController.changeMyPassword);
export default router;
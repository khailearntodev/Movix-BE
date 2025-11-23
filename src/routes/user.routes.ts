import express from 'express';
import * as userController from '../controllers/user.controller';
import * as adminUserController from '../controllers/admin.user.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = express.Router();

router.use(authenticateToken);

router.get('/me', userController.getMyProfile);
router.put('/me', userController.updateMyProfile);
router.post('/change-password', userController.changeMyPassword);

router.get('/admin/users', adminUserController.getUsers); 
router.get('/admin/users/:id', adminUserController.getUserDetail);
router.put('/admin/users/:id/status', adminUserController.updateUserStatus);
router.put('/admin/users/:id/flag', adminUserController.toggleFlag);

export default router;
import { Router } from 'express';
import { bannerController } from '../controllers/banner.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', bannerController.getAll);

// Protected Routes (Cần đăng nhập)
router.use(authenticateToken);

router.post('/', bannerController.create);
router.put('/:id', bannerController.update);
router.delete('/:id', bannerController.delete);
router.put('/:id/active', bannerController.toggleActive);

export default router;
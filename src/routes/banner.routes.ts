import { Router } from 'express';
import { bannerController } from '../controllers/banner.controller';

const router = Router();

// GET /api/banners
router.get('/', bannerController.getAll);

export default router;
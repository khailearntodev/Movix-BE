import { Router } from 'express';
import { recommendController } from '../recommendation/recommend.controller';

const router = Router();

router.post('/train', recommendController.trainModel);

export default router;

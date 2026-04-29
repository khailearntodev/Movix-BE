import express from 'express';
import { submitReport } from '../controllers/report.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = express.Router();

router.post('/', authenticateToken, submitReport);

export default router;

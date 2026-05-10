import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import * as adminReportController from '../controllers/admin.report.controller';

const router = express.Router();

router.get('/get-all', authenticateToken, adminReportController.getReports);
router.patch('/update-status/:id', authenticateToken, adminReportController.updateReportStatus);
router.get('/get-financial-report', authenticateToken, adminReportController.getFinancialStats);
router.patch('/moderate-and-hide-blog-post/:reportId', authenticateToken, adminReportController.moderateAndHideBlogPost);

export default router;

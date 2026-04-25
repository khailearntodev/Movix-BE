import express from 'express';
import * as downloadController from '../controllers/download.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = express.Router();

router.use(authenticateToken); // Protect all download routes

// POST /api/downloads/request
router.post('/request', downloadController.requestDownload);

// PATCH /api/downloads/:id/complete
router.patch('/:id/complete', downloadController.completeDownload);

// DELETE /api/downloads/:id
router.delete('/:id', downloadController.removeDownload);

// GET /api/downloads
router.get('/', downloadController.getListDownloads);

export default router;
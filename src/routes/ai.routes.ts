import { Router } from 'express';
import * as aiController from '../controllers/ai.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import multer from 'multer';
import { searchImage } from '../controllers/ai.controller';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/limit', authenticateToken, aiController.checkLimit);
router.post('/chat', authenticateToken, aiController.chat);
router.post('/search', authenticateToken, aiController.searchMovies);
router.post('/search-voice', authenticateToken, upload.single('audio'), aiController.searchMoviesVoice);
router.post('/search-image', authenticateToken, upload.single('image'), searchImage);

export default router;
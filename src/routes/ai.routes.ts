import { Router } from 'express';
import * as aiController from '../controllers/ai.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import multer from 'multer';
import { searchImage } from '../controllers/ai.controller';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/chat', authenticateToken, aiController.chat);
router.post('/search', aiController.searchMovies);
router.post('/search-voice', upload.single('audio'), aiController.searchMoviesVoice);
router.post('/search-image', upload.single('image'), searchImage);

export default router;
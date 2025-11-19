import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/stats', dashboardController.getStats);
router.get('/genres', dashboardController.getGenreDistribution);
router.get('/top-movies', dashboardController.getTopFavoritedMovies);
router.get('/recent-users', dashboardController.getRecentUsers);
router.get('/report-all', dashboardController.getReportData);

export default router;
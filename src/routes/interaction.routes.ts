import express from 'express';
import { interactionController } from '../controllers/interaction.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = express.Router();

router.use(authenticateToken);

// Favorites
router.post('/favorite/toggle', interactionController.toggleFavorite);
router.get('/favorites', interactionController.getFavoriteMovies);
router.get('/favorite/status', interactionController.checkFavoriteStatus);

// Playlists
router.get('/playlists', interactionController.getPlaylists);
router.post('/playlist/create', interactionController.createPlaylist);
router.post('/playlist/add', interactionController.addMovieToPlaylist);

export default router;
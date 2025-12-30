import express from 'express';
import { interactionController } from '../controllers/interaction.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = express.Router();

router.get('/rating/stats/:movieId', interactionController.getMovieRatingStats);
router.get('/rating/list/:movieId', interactionController.getMovieRatings);
router.use(authenticateToken);

// Favorites
router.post('/favorite/toggle', interactionController.toggleFavorite);
router.get('/favorites', interactionController.getFavoriteMovies);
router.get('/favorite/status', interactionController.checkFavoriteStatus);

// Playlists
router.get('/playlists', interactionController.getPlaylists); 
router.get('/playlists/:id', interactionController.getPlaylistDetail); 
router.post('/playlist/create', interactionController.createPlaylist);
router.post('/playlist/add', interactionController.addMovieToPlaylist);
router.delete('/playlists/:id/movies/:movieId', interactionController.removeMovieFromPlaylist); 
router.put('/playlists/:id', interactionController.updatePlaylist);
router.delete('/playlists/:id', interactionController.deletePlaylist);

//ratings
router.post('/rating', interactionController.rateMovie);       
router.get('/rating/my-rate', interactionController.getMyRating); 
router.delete('/rating/:movieId', interactionController.deleteRating);
router.get('/rating/stats/:movieId', interactionController.getMovieRatingStats);
export default router;
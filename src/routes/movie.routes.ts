import { Router } from 'express';
import { movieController } from '../controllers/movie.controller'; 

const router = Router();


// GET /api/movies/trending
router.get('/trending', movieController.getTrendingMovies);

// GET /api/movies/search
router.get('/search', movieController.search);

// GET /api/movies/episodes/:id/play (id là episodeId)
router.get('/episodes/:id/play', movieController.getEpisodePlaybackUrl);


// GET /api/movies/:slug
router.get('/:slug', movieController.getMovieBySlug);


export default router;
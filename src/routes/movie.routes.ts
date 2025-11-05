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

// GET /api/movies/popular-shows
router.get('/popular-shows', movieController.getPopularShows);

// GET /api/movies/by-genre/id (id cua the laoij phim)
router.get('/by-genre/:genreId', movieController.getByGenre);

export default router;
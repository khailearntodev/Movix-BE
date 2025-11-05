import express from 'express';
import * as movieController from '../controllers/movie.controller';

const router = express.Router();

// GET /api/v1/movies/trending
router.get('/trending', movieController.getTrending);

// GET /api/v1/movies/popular-shows
router.get('/popular-shows', movieController.getPopularShows);

// GET /api/v1/movies/by-genre/id (id cua the laoij phim)
router.get('/by-genre/:genreId', movieController.getByGenre);

export default router;
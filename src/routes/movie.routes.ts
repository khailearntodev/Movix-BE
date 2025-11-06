import { Router } from 'express';
import { movieController } from '../controllers/movie.controller'; 

const router = Router();

// GET /api/movies/genres (Lấy tất cả thể loại)
router.get('/genres', movieController.getAllGenres);

// GET /api/movies/countries (Lấy tất cả quốc gia)
router.get('/countries', movieController.getAllCountries);

// GET /api/movies/trending
router.get('/trending', movieController.getTrendingMovies);

// GET /api/movies/search
router.get('/search', movieController.search);

// GET /api/movies/episodes/:id/play (id là episodeId)
router.get('/episodes/:id/play', movieController.getEpisodePlaybackUrl);

// GET /api/movies/filter
router.get('/filter', movieController.filterMovies);

// GET /api/movies/popular-showstmdb
router.get('/popular-showstmdb', movieController.getPopularShows);

// GET /api/movies/by-genre/id (id cua the laoij phim)
router.get('/by-genre/:genreId', movieController.getByGenre);

// GET /api/movies/trendingtmdb    
router.get('/trendingtmdb', movieController.getTrending);

// GET /api/movies/:slug
router.get('/:slug', movieController.getMovieBySlug);

export default router;
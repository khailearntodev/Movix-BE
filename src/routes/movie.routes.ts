import { Router } from 'express';
import { movieController } from '../controllers/movie.controller'; 
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// ===  ROUTE TẠO PHIM (Cho ADMIN) ===
// POST /api/movies
router.post('/', movieController.createMovie);

// === ROUTE FETCH TMDB TV (CHO ADMIN) ===
// GET /tbdb/tv/:tmdbId
router.get('/tmdb/tv/:tmdbId', movieController.getTmdbTvDetails);

// GET /api/movies/genres (Lấy tất cả thể loại)
router.get('/genres', movieController.getAllGenres);

// GET /api/movies/countries (Lấy tất cả quốc gia)
router.get('/countries', movieController.getAllCountries);

// GET /api/movies/filter
router.get('/filter', movieController.filterMovies);

// GET /api/movies/search
router.get('/search', movieController.search);

// GET /tmdb/tv/:tmdbId
router.get('/tmdb/details/:tmdbId', movieController.getTmdbDetails);

// GET /api/movies/top-commented
router.get('/top-commented', movieController.getTopCommentedMovies);

// GET /api/movies/top-liked
router.get('/top-liked', movieController.getTopLikedMovies);

// GET /api/movies/top-viewed
router.get('/top-viewed', movieController.getTopViewedMovies);

// GET /api/movies/trending
router.get('/trending', movieController.getTrendingMovies);

// GET /api/movies/popular-shows
router.get('/popular-shows', movieController.getTrendingShows);

// DELETE /api/movies/:id
router.delete('/:id', movieController.deleteMovie);

// PUT /api/movies/:id
router.put('/:id', movieController.updateMovie);

// GET /api/movies/episodes/:id/play (id là episodeId)
router.get('/episodes/:id/play', movieController.getEpisodePlaybackUrl);

// GET /api/movies/by-genre/id (id cua the laoij phim)
router.get('/by-genre-landing/:id', movieController.getByGenreLanding);
router.get('/by-genre/:genreId', movieController.getByGenreLanding);

// GET /api/movies/popular-showstmdb
router.get('/popular-showstmdb', movieController.getPopularShowsTMDB);

// GET /api/movies/trendingtmdb    
router.get('/trendingtmdb', movieController.getTrendingTMDB);

router.get('/for-you', authenticateToken, movieController.getRecommendationsForUser);

// GET /api/movies/by-id/:id (Lấy phim theo ID, tránh xung đột với slug)
router.get('/by-id/:id', movieController.getMovieById);
// GET /api/movies/:slug/watch
router.get('/:slug/watch', movieController.getPlaybackBySlug);

// GET /api/movies/:slug
router.get('/:slug', movieController.getMovieBySlug);


export default router;
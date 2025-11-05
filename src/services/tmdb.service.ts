import axios from 'axios';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;

// Tạo một "client" axios đã cấu hình sẵn
const tmdbApiClient = axios.create({
  baseURL: TMDB_BASE_URL,
  params: {
    api_key: API_KEY,
    language: 'vi-VN',
  },
});

/**
 * Lấy danh sách phim thịnh hành trong tuần
 */
export const getTrendingMovies = async () => {
  try {
    const response = await tmdbApiClient.get('/trending/movie/week');
    return response.data.results;
  } catch (error) {
    console.error('Lỗi khi gọi TMDB - Trending Movies:', error);
    throw new Error('Không thể lấy phim thịnh hành.');
  }
};

/**
 * Lấy danh sách TV shows phổ biến
 */
export const getPopularTvShows = async () => {
  try {
    const response = await tmdbApiClient.get('/tv/popular');
    return response.data.results;
  } catch (error) {
    console.error('Lỗi khi gọi TMDB - Popular TV:', error);
    throw new Error('Không thể lấy TV shows phổ biến.');
  }
};

/**
 * Lấy danh sách phim theo thể loại, sắp xếp theo độ phổ biến
 */
export const getMoviesByGenre = async (genreId: string) => {
  try {
    const response = await tmdbApiClient.get('/discover/movie', {
      params: {
        with_genres: genreId,
        sort_by: 'popularity.desc',
        page: 1,
      },
    });
    return response.data.results.slice(0, 4);
  } catch (error) {
    console.error(`Lỗi khi gọi TMDB - Genre ${genreId}:`, error);
    throw new Error('Không thể lấy phim theo thể loại.');
  }
};
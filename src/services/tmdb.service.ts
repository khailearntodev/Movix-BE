import axios from 'axios';
import { getMovieImageUrl, getPersonAvatarUrl } from '../lib/tmdb.helpers';
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

const getPersonDetails = async (personId: number) => {
  try {
    const response = await tmdbApiClient.get(`/person/${personId}`);
    return response.data;
  } catch (error) {
    console.warn(`Không lấy được info person ${personId}`, error);
    return null;
  }
};

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

export const getTmdbMovieDetails = async (tmdbId: string) => {
  try {
    const response = await tmdbApiClient.get(
      `/movie/${tmdbId}`,
      {
        params: {
          append_to_response: 'credits,images,videos',
          include_image_language: 'en,null',
        },
      }
    );
    
    const data = response.data;

    const directorInfo = data.credits.crew.find((p: any) => p.job === 'Director');
    let directorFull = null;
    if (directorInfo) {
        const details = await getPersonDetails(directorInfo.id);
        directorFull = {
            id: directorInfo.id,
            name: directorInfo.name,
            profile_path: getPersonAvatarUrl(directorInfo.profile_path),
            biography: details?.biography || '',
            birthday: details?.birthday || null,
            gender: details?.gender || 0, // TMDB: 1=Female, 2=Male
        };
    }

    // 2. Xử lý Diễn viên 
    const castPromises = data.credits.cast.slice(0, 10).map(async (person: any) => {
        const details = await getPersonDetails(person.id);
        return {
            ...person, 
            profile_path: getPersonAvatarUrl(person.profile_path),
            biography: details?.biography || '',
            birthday: details?.birthday || null,
            gender: details?.gender || 0,
        };
    });
    
    const castFull = await Promise.all(castPromises);

    // Trích xuất quốc gia
    const countryName = data.production_countries && data.production_countries.length > 0
      ? data.production_countries[0].name
      : null;

    const trailer = data.videos.results.find(
      (vid: any) => vid.site === 'YouTube' && vid.type === 'Trailer'
    );
    const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;

    const formattedData = {
      tmdb_id: data.id,
      title: data.title,
      original_title: data.original_title,
      overview: data.overview,
      release_date: data.release_date,
      poster_url: getMovieImageUrl(data.poster_path, "poster"),
      backdrop_url: getMovieImageUrl(data.backdrop_path, "backdrop"),
      production_country: countryName, 
      genres: data.genres, 
      cast: castFull,
      director: directorFull,
      runtime: data.runtime, 
      trailer_url: trailerUrl,
    };
    
    return formattedData;

  } catch (error) {
    console.error('Lỗi khi fetch TMDB details:', error);
    throw new Error('Không tìm thấy phim trên TMDB hoặc API lỗi');
  }
};

export const getTmdbTvShowDetails = async (tmdbId: string) => {
  try {
    const response = await tmdbApiClient.get(
      `/tv/${tmdbId}`, 
      {
        params: {
          append_to_response: 'credits,images,videos',
          include_image_language: 'en,null',
        },
      }
    );
    
    const data = response.data;

    // 1. Xử lý Đạo diễn
    const directorInfo =
      data.created_by && data.created_by.length > 0
        ? data.created_by[0]
        : data.credits.crew.find((p: any) => p.job === 'Director');

    let directorFull = null;
    if (directorInfo) {
      const details = await getPersonDetails(directorInfo.id);
      directorFull = {
        id: directorInfo.id,
        name: directorInfo.name,
        profile_path: getPersonAvatarUrl(directorInfo.profile_path),
        biography: details?.biography || '',
        birthday: details?.birthday || null,
        gender: details?.gender || 0,
      };
    }

    // 2. Xử lý Diễn viên
    const castPromises = data.credits.cast.slice(0, 10).map(async (person: any) => {
      const details = await getPersonDetails(person.id);
      return {
        ...person,
        profile_path: getPersonAvatarUrl(person.profile_path),
        biography: details?.biography || '',
        birthday: details?.birthday || null,
        gender: details?.gender || 0,
      };
    });
    const castFull = await Promise.all(castPromises);

    //  Trích xuất quốc gia (TV dùng 'origin_country')
    const countryName = data.origin_country && data.origin_country.length > 0
      ? data.origin_country[0]
      : (data.production_countries && data.production_countries.length > 0 ? data.production_countries[0].name : null);

    const trailer = data.videos.results.find(
      (vid: any) => vid.site === 'YouTube' && vid.type === 'Trailer'
    );
    const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;

    const formattedData = {
      tmdb_id: data.id,
      title: data.name,
      original_title: data.original_name, 
      overview: data.overview,
      release_date: data.first_air_date, 
      poster_url: getMovieImageUrl(data.poster_path, "poster"),
      backdrop_url: getMovieImageUrl(data.backdrop_path, "backdrop"),
      production_country: countryName, 
      genres: data.genres, 
      cast: castFull,
      director: directorFull,
      runtime: data.episode_run_time && data.episode_run_time.length > 0 ? data.episode_run_time[0] : null,
      number_of_seasons: data.number_of_seasons, 
      trailer_url: trailerUrl,
    };
    
    return formattedData;

  } catch (error) {
    console.error('Lỗi khi fetch TMDB TV details:', error);
    throw new Error('Không tìm thấy TV show trên TMDB hoặc API lỗi');
  }
};
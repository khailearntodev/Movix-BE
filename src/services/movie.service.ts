import { prisma } from "../lib/prisma";
import { MediaType } from "@prisma/client";

export const getMovieById = async (movieId: string) => {
  try {
    const movie = await prisma.movie.findUnique({
      where: { 
        id: movieId,
        is_deleted: false 
      },
      include: {
        country: true,
        movie_genres: {
          include: { 
            genre: true 
          },
        },
        movie_people: {
          include: { 
            person: true 
          },
          orderBy: { 
            ordering: "asc" 
          },
        },
        seasons: {
          orderBy: { 
            season_number: "asc" 
          },
          include: {
            episodes: {
              orderBy: { 
                episode_number: "asc" 
              },
            },
          },
        },
      },
    });

    if (!movie) {
      throw new Error("Không tìm thấy phim");
    }

    return movie;
  } catch (error: any) {
    console.error("getMovieById error:", error);
    throw new Error(error.message || "Lỗi khi lấy thông tin phim");
  }
};

export const getTrendingMovies = async (limit = 10) => {
  return prisma.movie.findMany({
    where: { is_active: true, is_deleted: false, media_type: MediaType.MOVIE },
    orderBy: { created_at: 'desc' }, 
    take: limit,
    include: { movie_genres: { include: { genre: true } }, country: true, seasons: true, }
  });
};

export const getPopularShows = async (limit = 10) => {
  return prisma.movie.findMany({
    where: { is_active: true, is_deleted: false, media_type: MediaType.TV },
    orderBy: { created_at: 'desc' },
    take: limit,
    include: { movie_genres: { include: { genre: true } }, country: true, seasons: true}
  });
};

export const getMoviesByGenre = async (genreId: string, limit = 10) => {
  return prisma.movie.findMany({
    where: {
      is_active: true, is_deleted: false,
      movie_genres: { some: { genre_id: genreId } }
    },
    orderBy: { created_at: 'desc' },
    take: limit,
    include: { movie_genres: { include: { genre: true } }, country: true, seasons: true}
  });
};

export const getGenreIdByName = async (name: string) => {
    const genre = await prisma.genre.findFirst({ 
        where: { name: { equals: name, mode: 'insensitive' } } 
    });
    return genre?.id;
};

export const getBySlug = async (slug: string) => {
    return prisma.movie.findUnique({
        where: { slug },
        include: {
            movie_genres: { include: { genre: true } },
            movie_people: { include: { person: true } },
            country: true,
            seasons: { include: { episodes: true } }
        }
    });
};

export const getSlugById = async (movieId: string) => {
    const movie = await prisma.movie.findUnique({
        where: { id: movieId },
        select: { slug: true },
    });
    return movie?.slug || null;
}

export const movieService = {
    getMovieById,
    getSlugById,
    getTrendingMovies,
    getPopularShows,
    getMoviesByGenre,
    getGenreIdByName,
    getBySlug
};
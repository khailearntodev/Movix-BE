import { prisma } from "../lib/prisma";
import { MediaType } from "@prisma/client";
import { generateEmbedding } from "./ai.service";

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

export const getMostViewedMovies = async (limit = 10) => {
  return prisma.movie.findMany({
    where: { is_active: true, is_deleted: false },
    orderBy: { view_count: 'desc' },
    take: limit,
    include: { movie_genres: { include: { genre: true } }, country: true, seasons: true }
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

export const syncMovieEmbedding = async (movieId: string) => {
  try {
    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
      include: { movie_genres: { include: { genre: true } } }
    });

    if (!movie) {
      console.warn(`Không tìm thấy phim ID ${movieId} để đồng bộ Vector.`);
      return;
    }

    const genres = movie.movie_genres.map(g => g.genre.name).join(", ");
    const textToEmbed = `Tên phim: ${movie.title}. Tên gốc: ${movie.original_title}. Thể loại: ${genres}. Mô tả: ${movie.description || "Không có mô tả"}`;

    const embeddingArray = await generateEmbedding(textToEmbed);
    const embeddingString = `[${embeddingArray.join(',')}]`;

    await prisma.$executeRawUnsafe(
      `UPDATE movies SET embedding = $1::vector WHERE id = $2::uuid`,
      embeddingString,
      movie.id
    );

    console.log(`✅ [AI Sync] Đã đồng bộ Vector cho phim: ${movie.title}`);
  } catch (error) {
    console.error(`❌ [AI Sync] Lỗi đồng bộ Vector cho phim ID ${movieId}:`, error);
  }
};

export const movieService = {
    getMovieById,
    getSlugById,
    getTrendingMovies,
    getMostViewedMovies,
    getPopularShows,
    getMoviesByGenre,
    getGenreIdByName,
    getBySlug,
    syncMovieEmbedding
};
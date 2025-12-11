import axios from 'axios';
import { prisma } from '../lib/prisma';

const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const getSimilarMovies = async (movieId: string) => {
  try {
    const cached = await prisma.movieRecommendation.findUnique({
      where: { movie_id: movieId }
    });
    if (cached) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (cached.updated_at > oneDayAgo) {
        // @ts-ignore: Prisma JSON type handling
        return getMoviesFromIds(cached.similar_movies as string[]);
      }
    }

    const response = await axios.get(`${AI_URL}/recommend/${movieId}`);
    const similarIds = response.data.recommendations || [];

    if (similarIds.length > 0) {
      await prisma.movieRecommendation.upsert({
        where: { movie_id: movieId },
        update: { similar_movies: similarIds },
        create: {
          movie_id: movieId,
          similar_movies: similarIds
        }
      });
      
      return getMoviesFromIds(similarIds);
    }

    return [];

  } catch (error) {
    console.error("AI Service Error, falling back to genres:", error);
    return getFallbackMovies(movieId);
  }
};

async function getMoviesFromIds(ids: string[]) {
  if (!ids.length) return [];
  
  const movies = await prisma.movie.findMany({
    where: { 
      id: { in: ids },
      is_deleted: false,
      is_active: true
    },
    select: {
      id: true,
      title: true,
      slug: true,
      poster_url: true,
      release_date: true,
    }
  });

  const sortedMovies = ids
    .map(id => movies.find(m => m.id === id))
    .filter(Boolean); 

  return sortedMovies;
}

async function getFallbackMovies(movieId: string) {
  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    include: { movie_genres: true }
  });
  
  if (!movie || movie.movie_genres.length === 0) return [];
  
  const genreIds = movie.movie_genres.map(mg => mg.genre_id);
  
  return prisma.movie.findMany({
    where: {
      id: { not: movieId },
      movie_genres: { some: { genre_id: { in: genreIds } } },
      is_active: true
    },
    take: 10,
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      poster_url: true
    }
  });
}
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

const fullMovieInclude = {
    country: true,
    movie_genres: {
        include: { genre: true }
    },
    seasons: {
        orderBy: { season_number: 'asc' as const },
        include: {
            episodes: {
                orderBy: { episode_number: 'asc' as const }
            }
        }
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
    include: fullMovieInclude
  });
  return ids
    .map(id => movies.find(m => m.id === id))
    .filter(Boolean)
    .map(movie => ({
        ...movie,
        score: 0 
    })); 
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
export const getPersonalizedRecommendations = async (userId: string, limit: number = 20) => {
  const [recentHistory, favorites, highRatings] = await prisma.$transaction([
    prisma.watchHistory.findMany({
      where: { user_id: userId, is_deleted: false },
      orderBy: { watched_at: 'desc' },
      take: 5,
      select: { episode: { select: { season: { select: { movie_id: true } } } } }
    }),
    prisma.favourite.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 5,
      select: { movie_id: true }
    }),
    prisma.rating.findMany({
      where: { user_id: userId, rating: { gte: 8 }, is_deleted: false },
      orderBy: { created_at: 'desc' },
      take: 5,
      select: { movie_id: true }
    })
  ]);

  const seedMovieIds = new Set<string>();
  // @ts-ignore
  recentHistory.forEach(h => { if(h.episode?.season?.movie_id) seedMovieIds.add(h.episode.season.movie_id); });
  favorites.forEach(f => seedMovieIds.add(f.movie_id));
  highRatings.forEach(r => seedMovieIds.add(r.movie_id));
  if (seedMovieIds.size === 0) {
    return prisma.movie.findMany({
        where: { is_active: true, is_deleted: false },
        orderBy: { release_date: 'desc' },
        take: limit,
        include: fullMovieInclude 
    });
  }
  const selectedSeeds = Array.from(seedMovieIds).sort(() => 0.5 - Math.random()).slice(0, 5);

  const recommendationPromises = selectedSeeds.map(id => getSimilarMovies(id));
  const results = await Promise.all(recommendationPromises);


  const recommendedMap = new Map<string, any>();
  const excludeIds = new Set(seedMovieIds); 

  results.flat().forEach(movie => {
    // @ts-ignore
    if (!movie || excludeIds.has(movie.id)) return;
    
    // @ts-ignore
    if (recommendedMap.has(movie.id)) {
      // @ts-ignore
      const existing = recommendedMap.get(movie.id);
      existing.score += 1; 
    } else {
      // @ts-ignore
      recommendedMap.set(movie.id, { ...movie, score: 1 });
    }
  });
  return Array.from(recommendedMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};
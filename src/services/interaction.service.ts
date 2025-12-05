import { prisma } from '../lib/prisma';


export const toggleFavorite = async (userId: string, movieId: string) => {
  const existingFavorite = await prisma.favourite.findUnique({
    where: {
      user_id_movie_id: {
        user_id: userId,
        movie_id: movieId,
      },
    },
  });

  if (existingFavorite) {
    await prisma.favourite.delete({
      where: { id: existingFavorite.id },
    });
    return false; 
  } else {
    await prisma.favourite.create({
      data: {
        user_id: userId,
        movie_id: movieId,
      },
    });
    return true; 
  }
};

export const getFavoriteMovies = async (userId: string) => {
  return prisma.favourite.findMany({
    where: { user_id: userId },
    include: {
      movie: true, 
    },
    orderBy: {
      created_at: 'desc',
    },
  });
};

export const checkFavoriteStatus = async (userId: string, movieId: string) => {
  const existing = await prisma.favourite.findUnique({
    where: {
      user_id_movie_id: {
        user_id: userId,
        movie_id: movieId,
      },
    },
  });
  return !!existing; 
};

export const getPlaylists = async (userId: string) => {
  return prisma.playlist.findMany({
    where: { user_id: userId, is_deleted: false },
    include: {
      _count: {
        select: { playlist_movies: { where: { is_deleted: false } } }, 
      },
    },
    orderBy: { created_at: 'desc' },
  });
};

export const createPlaylist = async (userId: string, name: string) => {
  return prisma.playlist.create({
    data: {
      user_id: userId,
      name: name,
    },
  });
};

export const addMovieToPlaylist = async (
  userId: string,
  playlistId: string,
  movieId: string,
) => {
  const playlist = await prisma.playlist.findFirst({
    where: { id: playlistId, user_id: userId },
  });

  if (!playlist) {
    throw new Error('PLAYLIST_NOT_FOUND');
  }

  const existingEntry = await prisma.playlistMovie.findUnique({
    where: {
      playlist_id_movie_id: {
        playlist_id: playlistId,
        movie_id: movieId,
      },
    },
  });

  if (existingEntry) {
    if (existingEntry.is_deleted) {
      return prisma.playlistMovie.update({
        where: { id: existingEntry.id },
        data: { 
          is_deleted: false,
          created_at: new Date()
        },
      });
    } else {
      throw new Error('MOVIE_ALREADY_IN_PLAYLIST');
    }
  }
  return prisma.playlistMovie.create({
    data: {
      playlist_id: playlistId,
      movie_id: movieId,
    },
  });
};
export const getPlaylistDetail = async (userId: string, playlistId: string) => {
  const playlist = await prisma.playlist.findFirst({
    where: { 
      id: playlistId, 
      user_id: userId,
      is_deleted: false
    },
    include: {
      playlist_movies: {
        where: { is_deleted: false },
        orderBy: { created_at: 'desc' }, 
        include: {
          movie: true 
        }
      }
    }
  });

  if (!playlist) {
    throw new Error('PLAYLIST_NOT_FOUND');
  }

  const movies = playlist.playlist_movies.map(pm => ({
    ...pm.movie,
    added_at: pm.created_at 
  }));
  const { playlist_movies, ...playlistInfo } = playlist;

  return {
    ...playlistInfo,
    movies: movies
  };
};
export const removeMovieFromPlaylist = async (userId: string, playlistId: string, movieId: string) => {
  const playlist = await prisma.playlist.findFirst({
    where: { id: playlistId, user_id: userId }
  });

  if (!playlist) {
    throw new Error('PLAYLIST_NOT_FOUND');
  }

  try {
    return await prisma.playlistMovie.update({
      where: {
        playlist_id_movie_id: {
          playlist_id: playlistId,
          movie_id: movieId
        }
      },
      data: { is_deleted: true }
    });
  } catch (error) {
    throw new Error('MOVIE_NOT_IN_PLAYLIST');
  }
};
import { Request, Response } from 'express';
import * as tmdbService from '../services/tmdb.service';

export const getTrending = async (req: Request, res: Response) => {
  try {
    const movies = await tmdbService.getTrendingMovies();
    res.status(200).json(movies);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getPopularShows = async (req: Request, res: Response) => {
  try {
    const shows = await tmdbService.getPopularTvShows();
    res.status(200).json(shows);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getByGenre = async (req: Request, res: Response) => {
  try {
    const { genreId } = req.params;
    if (!genreId) {
      return res.status(400).json({ message: 'Genre ID là bắt buộc.' });
    }
    const movies = await tmdbService.getMoviesByGenre(genreId);
    res.status(200).json(movies);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
import { Request, Response } from 'express';
import * as tmdbService from '../services/tmdb.service';
import { Prisma } from '@prisma/client';
import { prisma } from "../lib/prisma";

export const movieController = {
  
  getAllGenres: async (req: Request, res: Response) => {
    try {
      const genres = await prisma.genre.findMany({
        orderBy: { name: 'asc' } 
      });
      res.status(200).json(genres);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Lỗi máy chủ khi lấy genres' });
    }
  },

  getAllCountries: async (req: Request, res: Response) => {
    try {
      const countries = await prisma.country.findMany({
        orderBy: { name: 'asc' }
      });
      res.status(200).json(countries);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Lỗi máy chủ khi lấy countries' });
    }
  },

  getTrendingMovies: async (req: Request, res: Response) => {
    try {
      const movies = await prisma.movie.findMany({
        where: { is_active: true, is_deleted: false },
        orderBy: { release_date: 'desc' },
        take: 10
      });
      res.status(200).json(movies);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Lỗi máy chủ' });
    }
  },

  search: async (req: Request, res: Response) => {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Thiếu query "q"' });
    }
    const query = q as string;

    try {
      const movies = await prisma.movie.findMany({
        where: {
          title: {
            contains: query,
            mode: 'insensitive'
          }
        },
        take: 10
      });

      const people = await prisma.person.findMany({
        where: {
          name: {
            contains: query,
            mode: 'insensitive'
          }
        },
        take: 10
      });

      res.status(200).json({ movies, people });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Lỗi máy chủ' });
    }
  },

  getMovieBySlug: async (req: Request, res: Response) => {
    const { slug } = req.params; 

    try {
      console.log("getMovieBySlug slug =", slug);

      if (!slug) {
        return res.status(400).json({ error: "Slug is required" });
      }

      const movie = await prisma.movie.findUnique({
        where: { slug },         
        include: {
          country: true,
          movie_genres: {
            include: { genre: true },
          },
          movie_people: {
            include: { person: true },
            orderBy: { ordering: "asc" },
          },
          seasons: {
            orderBy: { season_number: "asc" },
            include: {
              episodes: {
                orderBy: { episode_number: "asc" },
              },
            },
          },
        },
      });

      if (!movie) {
        return res.status(404).json({ error: "Không tìm thấy phim" });
      }

      return res.json(movie);
    } catch (error: any) {
      console.error("getMovieBySlug error:", error);
      return res.status(500).json({ error: "Lỗi máy chủ" });
    }
  },
  
  getEpisodePlaybackUrl: async (req: Request, res: Response) => {
    const { id } = req.params; 
    try {
      const episode = await prisma.episode.findUnique({
        where: { id },
        select: { video_url: true }
      });

      if (!episode) {
        return res.status(404).json({ error: 'Không tìm thấy tập phim' });
      }
      res.status(200).json(episode);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Lỗi máy chủ' });
    }
  },

  filterMovies: async (req: Request, res: Response) => {
    try {
      const { q, type, genre, country, year } = req.query;
      const where: Prisma.MovieWhereInput = {
        is_active: true,
        is_deleted: false,
      };

      if (typeof q === 'string' && q.trim()) {
        where.title = {
          contains: q.trim(),
          mode: 'insensitive',
        };
      }

      if (typeof type === 'string' && type !== 'Tất cả') {
        if (type === 'phim-bo') {
          where.seasons = {
            some: {},
          };
        } else if (type === 'phim-le') {
          where.seasons = {
            none: {},
          };
        }
      }

      if (typeof genre === 'string' && genre !== 'Tất cả') {
        where.movie_genres = {
          some: {
            genre: {
              name: {
                equals: genre,
                mode: 'insensitive',
              },
            },
          },
        };
      }

      if (typeof country === 'string' && country !== 'Tất cả') {
        where.country = {
          name: {
            equals: country,
            mode: 'insensitive',
          },
        };
      }

      if (typeof year === 'string' && year !== 'Tất cả') {
         const numericYear = parseInt(year);
         if (!isNaN(numericYear)) {
           const startDate = new Date(numericYear, 0, 1); 
           const endDate = new Date(numericYear, 11, 31); 
           where.release_date = {
             gte: startDate,
             lte: endDate,
           };
         }
      }

      const movies = await prisma.movie.findMany({
        where,
        include: {
          country: true,
          movie_genres: {
            include: { genre: true },
          },
        },
        orderBy: {
          release_date: 'desc',
        },
        take: 35,
      });

      res.status(200).json(movies);
      
    } catch (error: any) {
      console.error("Lỗi khi lọc phim:", error);
      res.status(500).json({ message: error.message || 'Lỗi máy chủ nội bộ' });
    }
  },

  getTrending: async (req: Request, res: Response) => {
    try {
      const movies = await tmdbService.getTrendingMovies();
      res.status(200).json(movies);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  getPopularShows: async (req: Request, res: Response) => {
    try {
      const shows = await tmdbService.getPopularTvShows();
      res.status(200).json(shows);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  getByGenre: async (req: Request, res: Response) => {
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
  }
};
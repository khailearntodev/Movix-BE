import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from "../lib/prisma";


export const movieController = {
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

};
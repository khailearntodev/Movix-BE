import { Request, Response } from 'express';
import { prisma } from "../lib/prisma";


export const genreController = {

  getAllGenres: async (req: Request, res: Response) => {
    try {
      const genres = await prisma.genre.findMany({
        where: { is_deleted: false }
      });
      res.status(200).json(genres);
    } catch (error) {
      console.error(error); 
      res.status(500).json({ error: 'Lỗi máy chủ' });
    }
  },
};
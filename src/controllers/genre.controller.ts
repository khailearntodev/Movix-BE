import { Request, Response } from 'express';
import { prisma } from "../lib/prisma";

export const genreController = {
  // 1. Lấy danh sách thể loại
  getAllGenres: async (req: Request, res: Response) => {
    try {
      const genres = await prisma.genre.findMany({
        orderBy: { name: 'asc' },
        where: { is_deleted: false },
        include: {
          _count: {
            select: { movie_genres: true },
          },
        },
      });
      res.status(200).json(genres);
    } catch (error) {
      console.error("Get genres error:", error);
      res.status(500).json({ message: 'Lỗi server khi tải danh sách thể loại' });
    }
  },

  // 2. Tạo thể loại mới
  createGenre: async (req: Request, res: Response) => {
    try {
      const { name } = req.body;

      if (!name || name.trim() === "") {
        return res.status(400).json({ message: "Tên thể loại không được để trống" });
      }

      const existingGenre = await prisma.genre.findUnique({
        where: { 
            name: name.trim() 
        },
      });

      if (existingGenre) {
        return res.status(409).json({ message: "Tên thể loại đã tồn tại" });
      }

      const newGenre = await prisma.genre.create({
        data: {
          name: name.trim(),
        },
      });

      res.status(201).json(newGenre);
    } catch (error) {
      console.error("Create genre error:", error);
      res.status(500).json({ message: 'Lỗi server khi tạo thể loại' });
    }
  },

  // 3. Cập nhật thể loại
  updateGenre: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!name || name.trim() === "") {
        return res.status(400).json({ message: "Tên thể loại không được để trống" });
      }

      const genreExists = await prisma.genre.findUnique({ where: { id } });
      if (!genreExists) {
        return res.status(404).json({ message: "Không tìm thấy thể loại" });
      }

      const duplicate = await prisma.genre.findFirst({
        where: {
          AND: [
            { id: { not: id } },  
            { name: name.trim() }    
          ]
        },
      });

      if (duplicate) {
        return res.status(409).json({ message: "Tên thể loại đã bị trùng" });
      }

      const updatedGenre = await prisma.genre.update({
        where: { id },
        data: { 
            name: name.trim(),
        },
      });

      res.status(200).json(updatedGenre);
    } catch (error) {
      console.error("Update genre error:", error);
      res.status(500).json({ message: 'Lỗi server khi cập nhật thể loại' });
    }
  },

  // 4. Xóa thể loại
  deleteGenre: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const genreExists = await prisma.genre.findUnique({ where: { id } });
      if (!genreExists) {
        return res.status(404).json({ message: "Thể loại không tồn tại" });
      }

      await prisma.genre.delete({ where: { id } });

      res.status(200).json({ message: "Đã xóa thể loại thành công" });
    } catch (error) {
      console.error("Delete genre error:", error);
      
      if ((error as any).code === 'P2003') {
        return res.status(400).json({ 
          message: "Không thể xóa vì thể loại này đang có phim sử dụng." 
        });
      }
      res.status(500).json({ message: 'Lỗi server khi xóa thể loại' });
    }
  },
};
import { Request, Response } from 'express';
import { prisma } from "../lib/prisma"; 

export const countryController = {
  // 1. Lấy danh sách quốc gia (kèm số lượng phim)
  getAllCountries: async (req: Request, res: Response) => {
    try {
      const countries = await prisma.country.findMany({
        orderBy: {
          name: 'asc',
        },
        include: {
          _count: {
            select: { movies: true }, 
          },
        },
      });
      
      res.status(200).json(countries);
    } catch (error) {
      console.error("Get all countries error:", error);
      res.status(500).json({ error: 'Lỗi máy chủ khi tải danh sách' });
    }
  },

  // 2. Tạo quốc gia mới
  createCountry: async (req: Request, res: Response) => {
    try {
      const { name } = req.body;

      if (!name || name.trim() === "") {
        return res.status(400).json({ message: "Tên quốc gia không được để trống" });
      }

      const existingCountry = await prisma.country.findUnique({
        where: { name: name.trim() },
      });

      if (existingCountry) {
        return res.status(409).json({ message: "Quốc gia này đã tồn tại" });
      }

      const newCountry = await prisma.country.create({
        data: {
          name: name.trim(),
        },
      });

      res.status(201).json(newCountry);
    } catch (error) {
      console.error("Create country error:", error);
      res.status(500).json({ error: 'Lỗi máy chủ khi tạo quốc gia' });
    }
  },

  // 3. Cập nhật quốc gia
  updateCountry: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!name || name.trim() === "") {
        return res.status(400).json({ message: "Tên quốc gia không được để trống" });
      }

      const countryExists = await prisma.country.findUnique({
        where: { id },
      });

      if (!countryExists) {
        return res.status(404).json({ message: "Không tìm thấy quốc gia" });
      }

      const duplicateName = await prisma.country.findFirst({
        where: {
          name: name.trim(),
          NOT: {
            id: id,
          },
        },
      });

      if (duplicateName) {
        return res.status(409).json({ message: "Tên quốc gia đã được sử dụng" });
      }

      const updatedCountry = await prisma.country.update({
        where: { id },
        data: { name: name.trim() },
      });

      res.status(200).json(updatedCountry);
    } catch (error) {
      console.error("Update country error:", error);
      res.status(500).json({ error: 'Lỗi máy chủ khi cập nhật quốc gia' });
    }
  },

  // 4. Xóa quốc gia
  deleteCountry: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const existingCountry = await prisma.country.findUnique({
        where: { id },
      });

      if (!existingCountry) {
        return res.status(404).json({ message: "Quốc gia không tồn tại" });
      }

      await prisma.country.delete({
        where: { id },
      });

      res.status(200).json({ message: "Đã xóa quốc gia thành công" });
    } catch (error) {
      console.error("Delete country error:", error);
      
      if ((error as any).code === 'P2003') {
        return res.status(400).json({ 
          message: "Không thể xóa vì quốc gia này đang gắn với phim." 
        });
      }

      res.status(500).json({ error: 'Lỗi máy chủ khi xóa quốc gia' });
    }
  },
};
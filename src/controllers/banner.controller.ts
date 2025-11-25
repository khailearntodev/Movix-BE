import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const bannerController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const banners = await prisma.banner.findMany({
        where: { is_deleted: false },
        orderBy: { created_at: 'desc' },
      });
      res.json(banners);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi lấy danh sách banner' });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { title, image_url, link_url, is_active } = req.body;

      if (!title || !image_url) {
        return res.status(400).json({ message: 'Thiếu tiêu đề hoặc ảnh banner' });
      }

      const banner = await prisma.banner.create({
        data: {
          title,
          image_url,
          link_url,
          is_active: is_active ?? true,
        },
      });
      res.status(201).json(banner);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Lỗi tạo banner' });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await prisma.banner.delete({
        where: { id },
      });
      res.json({ message: 'Xóa banner thành công' });
    } catch (error) {
      res.status(500).json({ message: 'Lỗi xóa banner' });
    }
  },

  // 4. Bật/Tắt trạng thái Active
  toggleActive: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const banner = await prisma.banner.findUnique({ where: { id } });
      
      if (!banner) {
        return res.status(404).json({ message: 'Banner không tồn tại' });
      }

      const updated = await prisma.banner.update({
        where: { id },
        data: { is_active: !banner.is_active },
      });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi cập nhật trạng thái' });
    }
  }
};
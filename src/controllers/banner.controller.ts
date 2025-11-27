import { Request, Response } from 'express';
import * as bannerService from '../services/banner.service';

export const bannerController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const banners = await bannerService.getActiveBanners();
      res.status(200).json(banners);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Lỗi lấy danh sách banner' });
    }
  }
};
import { Request, Response } from 'express';
import { watchPartyService } from '../services/watch-party.service';

export const watchPartyController = {
  create: async (req: Request, res: Response) => {
    try {
      const userId = req.userId!; 
      const { title, movieId, episodeId, isPrivate, scheduledAt } = req.body;

      if (!title || !movieId) {
        return res.status(400).json({ message: "Thiếu tên phòng hoặc phim." });
      }

      const newRoom = await watchPartyService.create(userId, { 
        title, 
        movieId, 
        episodeId,
        isPrivate, 
        scheduledAt 
      });
      
      res.status(201).json(newRoom);
    } catch (error: any) {
      if (error.message === "USER_HAS_ACTIVE_PARTY") {
          return res.status(409).json({ message: "Bạn đang có một phòng hoạt động. Hãy kết thúc nó trước khi tạo mới." });
      }
      
      console.error("Create Party Error:", error);
      res.status(500).json({ message: "Lỗi máy chủ khi tạo phòng." });
    }
  },

  getAll: async (req: Request, res: Response) => {
    try {
      const filter = (req.query.filter as 'live' | 'scheduled' | 'ended') || 'live';
      const search = req.query.q as string | undefined; 

      const rooms = await watchPartyService.getAll(filter, search);
      
      res.json(rooms);
    } catch (error) {
      console.error("Get All Parties Error:", error);
      res.status(500).json({ message: "Lỗi lấy danh sách phòng." });
    }
  },

  toggleReminder: async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { id } = req.params; 

      const result = await watchPartyService.toggleReminder(userId, id);
      res.json(result);
    } catch (error) {
      console.error("Toggle Reminder Error:", error);
      res.status(500).json({ message: "Lỗi đăng ký thông báo." });
    }
  },

  cancel: async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { id } = req.params; 

      await watchPartyService.cancel(userId, id);
      
      res.json({ success: true, message: "Đã hủy lịch công chiếu." });
    } catch (error: any) {
      if (error.message === "NOT_HOST") return res.status(403).json({ message: "Bạn không phải chủ phòng." });
      if (error.message === "PARTY_ALREADY_STARTED") return res.status(400).json({ message: "Phim đang chiếu, không thể hủy lịch." });
      
      console.error("Cancel Party Error:", error);
      res.status(500).json({ message: "Lỗi khi hủy phòng." });
    }
  },

  end: async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { id } = req.params; 

      await watchPartyService.end(userId, id);
      
      res.json({ success: true, message: "Đã kết thúc phòng xem chung." });
    } catch (error: any) {
      if (error.message === "NOT_HOST") {
        return res.status(403).json({ message: "Bạn không phải chủ phòng." });
      }
      console.error("End Party Error:", error);
      res.status(500).json({ message: "Lỗi khi kết thúc phòng." });
    }
  }
};
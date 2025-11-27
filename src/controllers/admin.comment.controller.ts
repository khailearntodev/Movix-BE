import { Request, Response } from 'express';
import * as adminCommentService from '../services/admin.comment.service';

export const adminCommentController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const take = parseInt(req.query.take as string) || 20;
      const search = (req.query.q as string) || '';
      const filter = (req.query.filter as 'all' | 'flagged' | 'hidden') || 'all';

      const result = await adminCommentService.getAllComments(page, take, search, filter);
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Lỗi lấy danh sách bình luận' });
    }
  },

  toggleHide: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updated = await adminCommentService.toggleCommentVisibility(id);
      res.json({ 
        message: updated.is_hidden ? 'Đã ẩn bình luận' : 'Đã hiện bình luận', 
        data: updated 
      });
    } catch (error) {
      res.status(500).json({ message: 'Lỗi cập nhật trạng thái' });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await adminCommentService.deleteCommentAdmin(id);
      res.json({ message: 'Đã xóa bình luận thành công' });
    } catch (error) {
      res.status(500).json({ message: 'Lỗi xóa bình luận' });
    }
  },
};
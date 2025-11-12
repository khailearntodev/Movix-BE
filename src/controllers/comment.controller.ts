import { Request, Response } from 'express';
import * as commentService from '../services/comment.service';

const getUserId = (req: Request) => req.userId as string;

export const commentController = {
  getComments: async (req: Request, res: Response) => {
    try {
      const { movieId } = req.query;
      if (!movieId) {
        return res.status(400).json({ message: 'Phải có movieId' });
      }
      const comments = await commentService.getCommentsByMovie(movieId as string);
      res.status(200).json(comments);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi máy chủ' });
    }
  },

  postComment: async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { movieId, comment, parentCommentId } = req.body;

      if (!movieId || !comment) {
        return res.status(400).json({ message: 'Phải có movieId và comment' });
      }

      const newComment = await commentService.createComment(
        userId,
        movieId,
        comment,
        parentCommentId,
      );
      res.status(201).json(newComment);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi máy chủ' });
    }
  },

  updateComment: async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { commentId } = req.params;
      const { comment } = req.body;

      if (!comment) {
        return res.status(400).json({ message: 'Phải có nội dung bình luận' });
      }

      const result = await commentService.updateComment(userId, commentId, comment);

      if (result.count === 0) {
        return res
          .status(404)
          .json({ message: 'Không tìm thấy bình luận hoặc bạn không có quyền' });
      }

      res.status(200).json({ message: 'Cập nhật bình luận thành công' });
    } catch (error) {
      res.status(500).json({ message: 'Lỗi máy chủ' });
    }
  },

  deleteComment: async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { commentId } = req.params;

      const result = await commentService.deleteComment(userId, commentId);

      if (result.count === 0) {
        return res
          .status(404)
          .json({ message: 'Không tìm thấy bình luận hoặc bạn không có quyền' });
      }

      res.status(200).json({ message: 'Xóa bình luận thành công' });
    } catch (error) {
      res.status(500).json({ message: 'Lỗi máy chủ' });
    }
  },
};
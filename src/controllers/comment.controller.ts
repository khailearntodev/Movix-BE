import { Request, Response } from 'express';
import * as commentService from '../services/comment.service';
import * as userService from '../services/user.service'; 
import * as movieService from '../services/movie.service';
import { checkToxicity } from '../services/perspective.service';
import { notifyCommentReply } from '../utils/notify/notification.helper';
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
      const { movieId, comment, parentCommentId, isSpoiler } = req.body;

      if (!movieId || !comment) {
        return res.status(400).json({ message: 'Phải có movieId và comment' });
      }
      const toxicityResult = await checkToxicity(comment);
      const shouldHide = toxicityResult.isToxic;

      const newComment = await commentService.createComment(
        userId,
        movieId,
        comment,
        parentCommentId,
        isSpoiler,
        toxicityResult.score,
        shouldHide
      );
      if (shouldHide) {
        return res.status(200).json({
          ...newComment,
          message: 'Bình luận của bạn đã được ghi nhận nhưng đang chờ duyệt vì chứa nội dung nhạy cảm.',
          is_hidden: true
        });
      }
      if (parentCommentId && !shouldHide) {
        try {
            const parentComment = await commentService.getCommentById(parentCommentId);
            if (parentComment && parentComment.user_id !== userId) {
                const [currentUser, currentMovie] = await Promise.all([
                    userService.getUserById(userId),
                    movieService.getMovieById(movieId)
                ]);

                if (currentUser && currentMovie) {
                    await notifyCommentReply(
                        parentComment.user_id,
                        currentUser.username || currentUser.display_name, 
                        currentMovie.title,
                        movieId
                    );
                }
            }
        } catch (notifyError) {
            console.error('Lỗi gửi thông báo reply:', notifyError);
        }
      }
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
      const toxicityResult = await checkToxicity(comment);
      const shouldHide = toxicityResult.isToxic;

      const result = await commentService.updateComment(userId,
        commentId,
        comment,
        toxicityResult.score,
        shouldHide);

      if (result.count === 0) {
        return res
          .status(404)
          .json({ message: 'Không tìm thấy bình luận hoặc bạn không có quyền' });
      }
      if (shouldHide) {
         return res.status(200).json({ message: 'Cập nhật thành công, nhưng bình luận đã bị ẩn do nội dung nhạy cảm.' });
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
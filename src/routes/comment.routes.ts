import express from 'express';
import { commentController } from '../controllers/comment.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = express.Router();

// GET /api/comments?movieId=... (Lấy bình luận cho phim)
router.get('/', commentController.getComments);
router.use(authenticateToken);

// POST /api/comments (Đăng bình luận mới hoặc trả lời)
router.post('/', commentController.postComment);

// PUT /api/comments/:commentId (Cập nhật bình luận)
router.put('/:commentId', commentController.updateComment);

// DELETE /api/comments/:commentId (Xóa bình luận)
router.delete('/:commentId', commentController.deleteComment);

export default router;
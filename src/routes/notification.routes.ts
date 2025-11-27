import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();
const controller = new NotificationController();
router.use(authenticateToken);
// Lấy danh sách thông báo
router.get('/',  controller. getNotifications. bind(controller));

// Lấy số lượng chưa đọc
router. get('/unread-count',controller.getUnreadCount.bind(controller));

// Đánh dấu đã đọc
router.patch('/:notificationId/read', controller.markAsRead.bind(controller));

// Đánh dấu tất cả đã đọc
router.patch('/read-all',controller.markAllAsRead.bind(controller));

// Xóa thông báo
router.delete('/:notificationId',controller.deleteNotification.bind(controller));

export default router;
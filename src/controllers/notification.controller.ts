import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { PushNotificationService } from '../services/push-notification.service';

export class NotificationController {
    private notificationService = new NotificationService();
    private pushNotificationService = new PushNotificationService();

    async getNotifications(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { page = 1, limit = 20 } = req.query;

            const result = await this.notificationService.getUserNotifications(
                userId,
                parseInt(page as string),
                parseInt(limit as string)
            );

            res.json({ success: true, data: result });
        } catch (error) {
            console.error('Sync Notification:', error);
            res.status(500).json({ message: 'Lỗi khi lấy thông báo' });
        }
    }

    // Đánh dấu đã đọc
    async markAsRead(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { notificationId } = req.params;

            await this.notificationService.markAsRead(userId, notificationId);
            res.json({ success: true });
        } catch (error) {
            console.error('Mark read error:', error);
            res.status(500).json({ message: 'Lỗi khi đánh dấu đã đọc' });
        }
    }

    // Đánh dấu tất cả đã đọc
    async markAllAsRead(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            await this.notificationService.markAllAsRead(userId);
            res.json({ success: true });
        } catch (error) {
            console.error('markAllAsRead:', error);
            res.status(500).json({ message: 'Lỗi khi đánh dấu đã đọc tất cả' });
        }
    }

    // Lấy số thông báo chưa đọc
    async getUnreadCount(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const count = await this.notificationService.getUnreadCount(userId);
            res.json({ success: true, data: { count } });
        } catch (error) {
            console.error('getUnreadCount:', error);
            res.status(500).json({ message: 'Lỗi khi lấy thông báo chưa đọc' });
        }
    }

    async deleteNotification(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const { notificationId } = req.params;

            await this.notificationService.deleteNotification(userId, notificationId);
            res.json({ success: true });
        } catch (error) {
            console.error('deleteNotification:', error);
            res.status(500).json({ message: 'Lỗi khi xóa thông báo' });
        }
    }

    // Subscribe Web Push
    async subscribe(req: Request, res: Response) {
        try {
            const userId = req.userId!;
            const subscription = req.body;

            await this.pushNotificationService.subscribe(userId, subscription);
            res.status(201).json({ success: true, message: 'Subscribed to push notifications' });
        } catch (error) {
            console.error('Subscribe error:', error);
            res.status(500).json({ message: 'Failed to subscribe' });
        }
    }
}
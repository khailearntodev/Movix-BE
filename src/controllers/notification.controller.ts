import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { PushNotificationService } from '../services/push-notification.service';
import { getNotificationService } from '../utils/notify/notification.helper';

export class NotificationController {

    private pushNotificationService = new PushNotificationService();
    private get notificationService() {
        return getNotificationService();
    }
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

    async sendCustomNotification(req: Request, res: Response) {
        try {
            const { targetUserId, targetType, title, message, url } = req.body;

            if (targetType === 'all_users') {
                await this.notificationService.broadcastSystemNotification(title, message, { actionUrl: url });
                return res.json({ success: true, message: 'Đã gửi thông báo toàn hệ thống.' });
            } 

            if (targetType === 'all_admins') {
                const adminIds = await this.notificationService.getAllAdminIds();
                if (adminIds.length > 0) {
                    await this.notificationService.createBulkNotifications(adminIds, {
                        type: "SYSTEM" as any,
                        title,
                        message,
                        actionUrl: url,
                        data: { targetGroup: 'admins' }
                    });
                }
                return res.json({ success: true, message: `Đã gửi cho ${adminIds.length} quản trị viên.` });
            }
            
            if (targetType === 'specific' && targetUserId) {
                await this.notificationService.createNotification({
                    userId: targetUserId,
                    type: "SYSTEM" as any,
                    title,
                    message,
                    actionUrl: url
                });
                return res.json({ success: true, message: 'Đã gửi thông báo cá nhân.' });
            }

            res.status(400).json({ message: 'Thiếu thông tin người nhận.' });
        } catch (error) {
            console.error('Send Custom Notification:', error);
            res.status(500).json({ message: 'Lỗi khi gửi thông báo' });
        }
    }

    async getHistory(req: Request, res: Response) {
        try {
            const { page = 1, limit = 10 } = req.query;
            const result = await this.notificationService.getSystemNotificationHistory(
                Number(page), 
                Number(limit)
            );
            res.json(result);
        } catch (error) {
            res.status(500).json({ message: 'Lỗi lấy lịch sử' });
        }
    }
}
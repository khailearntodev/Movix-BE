import { PrismaClient } from '@prisma/client';
import { CreateNotificationDto, NotificationResponse, NotificationType } from '../types/notification';
import { PushNotificationService } from './push-notification.service';

export class NotificationService {
  private prisma: PrismaClient;
  private webSocketService: any;
  private pushNotificationService = new PushNotificationService();

  constructor(webSocketService?: any) {
    this.prisma = new PrismaClient();
    this.webSocketService = webSocketService;
  }

  setWebSocketService(webSocketService: any) {
    this.webSocketService = webSocketService;
  }

  async createNotification(dto: CreateNotificationDto): Promise<NotificationResponse> {
    const notification = await this.prisma.notification.create({
      data: {
        user_id: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: dto.data || {},
        action_url: dto.actionUrl
      }
    });

    if (this.webSocketService && dto.userId) {
      await this.webSocketService.sendNotificationToUser(dto.userId, notification);
    }

    if (dto.userId) {
      await this.pushNotificationService.sendNotification(dto.userId, {
        title: dto.title,
        message: dto.message,
        url: dto.actionUrl
      });
    }

    return this.formatResponse(notification);
  }

  async createBulkNotifications(userIds: string[], dto: Omit<CreateNotificationDto, 'userId'>): Promise<void> {
    const notifications = userIds.map(userId => ({
      user_id: userId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      data: dto.data || {},
      action_url: dto.actionUrl
    }));

    await this.prisma.notification.createMany({
      data: notifications
    });

    if (this.webSocketService) {
      const sampleNotification = notifications[0];
      await this.webSocketService.sendNotificationToUsers(userIds, {
        id: 'bulk',
        ...sampleNotification,
        created_at: new Date()
      });
    }
  }

  async broadcastSystemNotification(title: string, message: string, data?: any): Promise<void> {
    const notification = await this.prisma.notification.create({
      data: {
        type: NotificationType.SYSTEM,
        title,
        message,
        data: data || {}
      }
    });
    if (this.webSocketService) {
      await this.webSocketService.broadcastSystemNotification(notification);
    }
  }

  async getUserNotifications(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: {
          user_id: userId,
          is_deleted: false
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.notification.count({
        where: { user_id: userId, is_deleted: false }
      })
    ]);

    return {
      notifications: notifications.map(this.formatResponse),
      total,
      page,
      hasNext: skip + limit < total
    };
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        user_id: userId
      },
      data: {
        is_read: true
      }
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        user_id: userId,
        is_read: false
      },
      data: {
        is_read: true
      }
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await this.prisma.notification.count({
      where: {
        user_id: userId,
        is_read: false,
        is_deleted: false
      }
    });
  }

  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        user_id: userId
      },
      data: {
        is_deleted: true
      }
    });
  }

  private formatResponse(notification: any): NotificationResponse {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      actionUrl: notification.action_url,
      isRead: notification.is_read,
      createdAt: notification.created_at
    };
  }
}
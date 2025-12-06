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

    const pushPromises = userIds.map(userId => 
      this.pushNotificationService.sendNotification(userId, {
        title: dto.title,
        message: dto.message,
        url: dto.actionUrl,
      })
    );

    Promise.allSettled(pushPromises).then(results => {
        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length > 0) {
            console.warn(`⚠️ Có ${failed.length}/${userIds.length} thông báo đẩy bị lỗi (có thể do user chưa subscribe).`);
        }
    });
  }

async broadcastSystemNotification(title: string, message: string, data?: any): Promise<void> {
    const users = await this.prisma.user.findMany({
        where: { is_deleted: false, status: 'active' },
        select: { id: true }
    });
    const userIds = users.map(u => u.id);
    if (userIds.length === 0) return;

    const actionUrl = data?.actionUrl;
    
    await this.createBulkNotifications(userIds, {
      type: 'SYSTEM' as any,
      title,
      message,
      data: data || {},
      actionUrl
    });

  }

  async getUserNotifications(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const whereCondition = {
      AND: [
        { is_deleted: false },
        {
          OR: [
            { user_id: userId },    
            { user_id: null, type: 'SYSTEM' as any } 
          ]
        }
      ]
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: whereCondition,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.notification.count({
        where: whereCondition
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
        is_read: false,
        is_deleted: false,
        OR: [
          { user_id: userId },
          { user_id: null, type: 'SYSTEM' as any }
        ]
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

  async getAllAdminIds(): Promise<string[]> {
    const admins = await this.prisma.user.findMany({
      where: {
        role: { name: 'Admin' },
        is_deleted: false
      },
      select: { id: true }
    });
    return admins.map(a => a.id);
  }

  async getAllUserIds(): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: { is_deleted: false, status: 'active' },
      select: { id: true }
    });
    return users.map(u => u.id);
  }

  async getSystemNotificationHistory(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const whereCondition = {
      type: 'SYSTEM' as any, 
      is_deleted: false,
      OR: [
        { user_id: null }, 
        {
            user: {
                OR: [
                    { role: { name: 'Admin' } }, 
                    { is_flagged: true }       
                ]
            }
        }
      ]
    };
    const [history, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: whereCondition,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
            user: {
                select: { 
                    id: true, 
                    username: true, 
                    display_name: true, 
                    avatar_url: true,
                    role: { select: { name: true } }, 
                    is_flagged: true                  
                }
            }
        }
      }),
      this.prisma.notification.count({ where: whereCondition })
    ]);

    return {
      data: history.map(item => ({
          ...this.formatResponse(item),
          recipient: item.user ? {
              username: item.user.username,
              displayName: item.user.display_name,
              avatarUrl: item.user.avatar_url,
              role: item.user.role?.name,
              isFlagged: item.user.is_flagged
          } : null
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async notifyAdminsAboutFlaggedActivity(username: string, action: string, link: string) {
    const adminIds = await this.getAllAdminIds();
    if (adminIds.length === 0) return;

    await this.createBulkNotifications(adminIds, {
      type: NotificationType.SYSTEM,
      title: '⚠️ Cảnh báo: User bị gắn cờ',
      message: `User "${username}" vừa ${action}. Cần xem xét ngay.`,
      actionUrl: link,
      data: { flagged: true }
    });
  }
}
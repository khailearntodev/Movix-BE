import { PrismaClient, NotificationChannel } from '@prisma/client';
import { CreateNotificationDto, NotificationResponse, NotificationType } from '../types/notification';
import { PushNotificationService } from './push-notification.service';
import { ExpoPushService } from './expo-push.service';
import { sendNotificationEmail } from './email.service';
import { notificationQueue } from './notification.worker.service';

export class NotificationService {

  private prisma: PrismaClient;
  private webSocketService: any;
  private pushNotificationService = new PushNotificationService();
  private expoPushService = new ExpoPushService();

  constructor(webSocketService?: any) {
    this.prisma = new PrismaClient();
    this.webSocketService = webSocketService;
  }

  setWebSocketService(webSocketService: any) {
    this.webSocketService = webSocketService;
  }

  async unregisterDevice(userId: string, token: string) {
    await this.prisma.pushSubscription.deleteMany({
      where: {
        user_id: userId,
        OR: [
          { expo_token: token },
          { endpoint: token }
        ]
      }
    });
  }

  async createNotification(dto: CreateNotificationDto): Promise<NotificationResponse> {
    const notification = await this.prisma.notification.create({
      data: {
        user_id: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: dto.data || {},
        action_url: dto.actionUrl,
        channel: dto.channel || NotificationChannel.IN_APP,
        scheduled_at: dto.scheduledAt || null,
        is_sent: false
      }
    });

    let delay = 0;
    if (dto.scheduledAt) {
      const targetTime = new Date(dto.scheduledAt).getTime();
      const now = Date.now();
      delay = targetTime > now ? targetTime - now : 0;
    }

    await notificationQueue.add(
      'process-notification',
      { notificationId: notification.id },
      { delay }
    );

    return this.formatResponse(notification);
  }

  async executeScheduledJob(notificationId: string): Promise<void> {
    const notif = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: { user: true }
    });

    if (!notif || notif.is_sent) return;

    try {
      if ((notif.channel === NotificationChannel.IN_APP || notif.channel === NotificationChannel.PUSH) && this.webSocketService && notif.user_id) {
        await this.webSocketService.sendNotificationToUser(notif.user_id, notif);
      }

      if (notif.channel === NotificationChannel.PUSH && notif.user_id) {
        await this.pushNotificationService.sendNotification(notif.user_id, {
          title: notif.title,
          message: notif.message,
          url: notif.action_url || undefined
        });

        await this.expoPushService.sendNotification(notif.user_id, {
          title: notif.title,
          message: notif.message,
          data: { url: notif.action_url }
        });
      }

      if (notif.channel === NotificationChannel.EMAIL && notif.user?.email) {
        const htmlContent = `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>${notif.title}</h2>
            <p>${notif.message}</p>
            ${notif.action_url ? `<a href="${process.env.FRONTEND_URL || ''}${notif.action_url}" style="color: #E50914;">Xem chi tiết tại Movix</a>` : ''}
          </div>
        `;
        await sendNotificationEmail(notif.user.email, notif.title, htmlContent);
      }

      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { is_sent: true, sent_at: new Date() }
      });

    } catch (error) {
      console.error(`[NotificationService] Lỗi khi gửi thông báo ${notificationId}:`, error);
      throw error;
    }
  }

  async createBulkNotifications(userIds: string[], dto: Omit<CreateNotificationDto, 'userId'>): Promise<void> {
    const channel = dto.channel || NotificationChannel.IN_APP;
    const scheduledAt = dto.scheduledAt || null;
    const startTime = new Date();

    const notifications = userIds.map(userId => ({
      user_id: userId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      data: dto.data || {},
      action_url: dto.actionUrl,
      channel: channel,
      scheduled_at: scheduledAt,
      is_sent: false
    }));

    await this.prisma.notification.createMany({
      data: notifications
    });

    let delay = 0;
    if (scheduledAt) {
      const targetTime = new Date(scheduledAt).getTime();
      const now = Date.now();
      delay = targetTime > now ? targetTime - now : 0;
    }

    const createdNotifications = await this.prisma.notification.findMany({
      where: {
        user_id: { in: userIds },
        created_at: { gte: startTime },
        title: dto.title,
        is_sent: false
      },
      select: { id: true }
    });

    if (createdNotifications.length > 0) {
      const jobs = createdNotifications.map(n => ({
        name: 'process-notification',
        data: { notificationId: n.id },
        opts: { delay }
      }));
      await notificationQueue.addBulk(jobs);
    }
  }

  async broadcastSystemNotification(title: string, message: string, data?: any): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { is_deleted: false, status: 'active' },
      select: { id: true }
    });
    const userIds = users.map(u => u.id);
    if (userIds.length === 0) return;

    await this.createBulkNotifications(userIds, {
      type: NotificationType.SYSTEM,
      title,
      message,
      data: data || {},
      actionUrl: data?.actionUrl,
      channel: data?.channel,
      scheduledAt: data?.scheduledAt
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
import { PrismaClient, NotificationChannel } from '@prisma/client';
import { CreateNotificationDto, NotificationResponse, NotificationType } from '../types/notification';
import { PushNotificationService } from './push-notification.service';
import { ExpoPushService } from './expo-push.service';
import { sendNotificationEmail } from './email.service';
import { notificationQueue } from '../types/notification.queue';

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
        const appName = process.env.APP_NAME || 'Movix';
        const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
        let actionLink = frontendUrl;

        if (notif.action_url) {
          if (notif.action_url.startsWith('http')) {
            actionLink = notif.action_url;
          } else {
            const path = notif.action_url.startsWith('/') ? notif.action_url : `/${notif.action_url}`;
            actionLink = `${frontendUrl}${path}`;
          }
        }

        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${notif.title}</title>
            <style>
              body { margin: 0; padding: 0; background-color: #141414; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
              .container { width: 100%; max-width: 600px; margin: 0 auto; background-color: #000000; border-radius: 8px; overflow: hidden; }
              .header { padding: 30px; text-align: center; background-color: #000000; }
              .logo { color: #E50914; font-size: 32px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; text-decoration: none; }
              .content { padding: 40px 50px; background-color: #141414; color: #ffffff; }
              .title { font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #ffffff; }
              .message { font-size: 16px; line-height: 1.6; color: #cccccc; margin-bottom: 30px; }
              .button-container { text-align: center; margin-top: 20px; }
              .button { background-color: #E50914; color: #ffffff !important; padding: 12px 30px; border-radius: 4px; text-decoration: none; font-weight: bold; display: inline-block; }
              .footer { padding: 30px; text-align: center; color: #666666; font-size: 12px; background-color: #000000; border-top: 1px solid #333; }
              .footer a { color: #888888; text-decoration: underline; }
            </style>
          </head>
          <body>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <div class="container">
                    <div class="header">
                      <a href="${frontendUrl}" class="logo">${appName}</a>
                    </div>
                    <div class="content">
                      <div class="title">${notif.title}</div>
                      <div class="message">${notif.message}</div>
                      ${notif.action_url ? `
                      <div class="button-container">
                        <a href="${actionLink}" class="button">Xem ngay tại Movix</a>
                      </div>
                      ` : ''}
                    </div>
                    <div class="footer">
                      <p>Bạn nhận được email này vì bạn là thành viên của ${appName}.</p>
                      <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
                      <p><a href="${frontendUrl}/profile">Quản lý cài đặt thông báo</a></p>
                    </div>
                  </div>
                </td>
              </tr>
            </table>
          </body>
          </html>
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

    let delay = 0;
    if (scheduledAt) {
      const targetTime = new Date(scheduledAt).getTime();
      const now = Date.now();
      delay = targetTime > now ? targetTime - now : 0;
    }

    const createdNotifications = await (this.prisma.notification as any).createManyAndReturn({
      data: notifications,
      select: { id: true }
    });

    if (createdNotifications.length > 0) {
      const jobs = createdNotifications.map((n: any) => ({
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
      channel: notification.channel,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      actionUrl: notification.action_url,
      isRead: notification.is_read,
      isSent: notification.is_sent,
      scheduledAt: notification.scheduled_at,
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
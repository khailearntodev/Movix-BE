import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

export class WebSocketService {
  private io: SocketIOServer;
  private prisma: PrismaClient;
  private userSockets: Map<string, Set<string>> = new Map(); 

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "",
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    this.prisma = new PrismaClient();
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.use(async (socket, next) => {
      try {
        const token = socket. handshake.auth.token || socket.handshake.headers. authorization?. replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const user = await this.prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, username: true, display_name: true }
        });

        if (!user) {
          return next(new Error('User not found'));
        }

        socket.data.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      const user = socket.data.user;
      console.log(`User ${user.username} connected with socket ${socket.id}`);

      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)!.add(socket.id);

      socket.join(`user:${user.id}`);
      this.sendUnreadCount(user.id);

      this.handleSocketEvents(socket);
      socket.on('disconnect', () => {
        console.log(`User ${user.username} disconnected`);
        const userSocketSet = this.userSockets.get(user.id);
        if (userSocketSet) {
          userSocketSet.delete(socket. id);
          if (userSocketSet.size === 0) {
            this.userSockets. delete(user.id);
          }
        }
      });
    });
  }

  private handleSocketEvents(socket: any): void {
    const userId = socket.data.user.id;

    socket.on('notification:mark-read', async (notificationId: string) => {
      try {
        await this.prisma.notification.updateMany({
          where: {
            id: notificationId,
            user_id: userId,
            is_read: false
          },
          data: {
            is_read: true
          }
        });

        this.sendUnreadCount(userId);
        
        socket.emit('notification:marked-read', { notificationId });
      } catch (error) {
        socket.emit('notification:error', { message: 'Failed to mark as read' });
      }
    });
    socket. on('notification:mark-all-read', async () => {
      try {
        await this. prisma.notification.updateMany({
          where: {
            user_id: userId,
            is_read: false,
            is_deleted: false
          },
          data: {
            is_read: true
          }
        });

        this.sendUnreadCount(userId);
        socket.emit('notification:all-marked-read');
      } catch (error) {
        socket.emit('notification:error', { message: 'Failed to mark all as read' });
      }
    });
    socket.on('notification:get-latest', async (limit: number = 5) => {
      try {
        const notifications = await this.prisma. notification.findMany({
          where: {
            user_id: userId,
            is_deleted: false
          },
          orderBy: { created_at: 'desc' },
          take: limit
        });

        socket.emit('notification:latest', notifications);
      } catch (error) {
        socket.emit('notification:error', { message: 'Failed to fetch notifications' });
      }
    });
   
  }

  async sendNotificationToUser(userId: string, notification: any): Promise<void> {
    this.io.to(`user:${userId}`).emit('notification:new', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      actionUrl: notification.action_url,
      createdAt: notification.created_at
    });
    await this.sendUnreadCount(userId);
  }

  async sendNotificationToUsers(userIds: string[], notification: any): Promise<void> {
    const notificationData = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      actionUrl: notification.action_url,
      createdAt: notification. created_at
    };

    userIds.forEach(userId => {
      this.io.to(`user:${userId}`).emit('notification:new', notificationData);
    });
    await Promise.all(userIds.map(userId => this.sendUnreadCount(userId)));
  }

  async broadcastSystemNotification(notification: any): Promise<void> {
    this.io.emit('notification:system', {
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      createdAt: new Date()
    });
  }


  // Gửi số thông báo chưa đọc
  private async sendUnreadCount(userId: string): Promise<void> {
    try {
      const unreadCount = await this.prisma.notification.count({
        where: {
          user_id: userId,
          is_read: false,
          is_deleted: false
        }
      });

      this.io.to(`user:${userId}`).emit('notification:unread-count', { count: unreadCount });
    } catch (error) {
      console.error('Error sending unread count:', error);
    }
  }
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  getOnlineUsers(): string[] {
    return Array.from(this. userSockets.keys());
  }

  getOnlineUserCount(): number {
    return this.userSockets.size;
  }
}
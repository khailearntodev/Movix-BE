import { NotificationChannel } from '@prisma/client';

export enum NotificationType {
  NEW_MOVIE = 'NEW_MOVIE',
  COMMENT_REPLY = 'COMMENT_REPLY',
  WATCH_PARTY_INVITE = 'WATCH_PARTY_INVITE',
  SYSTEM = 'SYSTEM',
  ACHIEVEMENT_UNLOCKED = 'ACHIEVEMENT_UNLOCKED',
}

export interface CreateNotificationDto {
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  actionUrl?: string;
  channel?: NotificationChannel;
  scheduledAt?: Date;
}

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  channel?: NotificationChannel;
  title: string;
  message: string;
  data?: any;
  actionUrl?: string;
  isRead: boolean;
  isSent?: boolean;
  scheduledAt?: Date;
  createdAt: Date;
}
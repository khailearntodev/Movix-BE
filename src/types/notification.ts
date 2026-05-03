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
}

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  actionUrl?: string;
  isRead: boolean;
  createdAt: Date;
}
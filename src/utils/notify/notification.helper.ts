import { NotificationType } from '../../types/notification';

let notificationService: any = null;

export function setNotificationService(service: any) {
  notificationService = service;
}

export async function notifyNewMovie(movieId: string, movieTitle: string) {
  if (!notificationService) return;
  
  await notificationService.broadcastSystemNotification(
    'Phim mới! ',
    `"${movieTitle}" vừa được thêm vào Movix`,
    { movieId, actionUrl: `/movies/${movieId}` }
  );
}

export async function notifyCommentReply(
  originalUserId: string,
  replyUserName: string,
  movieTitle: string,
  movieSlug: string
  
) {
  if (!notificationService) return;

  await notificationService.createNotification({
    userId: originalUserId,
    type: NotificationType.COMMENT_REPLY,
    title: 'Có người phản hồi bình luận',
    message: `${replyUserName} đã phản hồi bình luận của bạn về "${movieTitle}"`,
    data: { movieSlug },
    actionUrl: `/movies/${movieSlug}#comments`
  });
}

export async function notifySystem(userId: string, title: string, message: string, actionUrl?: string) {
  if (!notificationService) return;

  await notificationService.createNotification({
    userId,
    type: NotificationType. SYSTEM,
    title,
    message,
    actionUrl
  });
}

export async function notifyMultipleUsers(userIds: string[], title: string, message: string, data?: any) {
  if (! notificationService) return;

  await notificationService.createBulkNotifications(userIds, {
    type: NotificationType.SYSTEM,
    title,
    message,
    data
  });
}
import webpush from 'web-push';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:huymynhonabcd@gmail.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
} else {
    console.warn('VAPID Keys not found in .env. Web Push Notifications will not work.');
}

export class PushNotificationService {

    async subscribe(userId: string, subscription: any) {
        if (!subscription || !subscription.endpoint || !subscription.keys) {
            throw new Error('Invalid subscription object');
        }
        const existing = await prisma.pushSubscription.findUnique({
            where: { endpoint: subscription.endpoint }
        });

        if (existing) {
            // Nếu đã tồn tại nhưng user_id khác (ví dụ user khác login trên cùng thiết bị), update user_id
            if (existing.user_id !== userId) {
                await prisma.pushSubscription.update({
                    where: { id: existing.id },
                    data: { user_id: userId }
                });
            }
            return existing;
        }

        // Tạo mới
        return await prisma.pushSubscription.create({
            data: {
                user_id: userId,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth
            }
        });
    }

    async sendNotification(userId: string, payload: { title: string; message: string; url?: string; icon?: string }) {
        if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
            return;
        }

        const subscriptions = await prisma.pushSubscription.findMany({
            where: { user_id: userId }
        });

        if (subscriptions.length === 0) return;

        const notificationPayload = JSON.stringify({
            title: payload.title,
            body: payload.message,
            icon: payload.icon || '/icon.png',
            data: {
                url: payload.url || '/'
            }
        });

        const promises = subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                }, notificationPayload);
            } catch (error: any) {
                if (error.statusCode === 410 || error.statusCode === 404) {
                    console.log(`Removing expired subscription for user ${userId}`);
                    await prisma.pushSubscription.delete({
                        where: { id: sub.id }
                    });
                } else {
                    console.error('Error sending push notification:', error);
                }
            }
        });

        await Promise.all(promises);
    }
}

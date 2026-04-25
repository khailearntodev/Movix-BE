import { Expo, ExpoPushMessage, ExpoPushTicket, ExpoPushReceipt } from 'expo-server-sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


const expo = new Expo({
    accessToken: process.env.EXPO_ACCESS_TOKEN, 
});

export class ExpoPushService {

    async subscribe(userId: string, expoToken: string) {
        if (!Expo.isExpoPushToken(expoToken)) {
            throw new Error(`Push token ${expoToken} is not a valid Expo push token`);
        }

        const existing = await prisma.pushSubscription.findUnique({
            where: { expo_token: expoToken }
        });

        if (existing) {
            if (existing.user_id !== userId) {
                await prisma.pushSubscription.update({
                    where: { id: existing.id },
                    data: { user_id: userId }
                });
            }
            return existing;
        }
        return await prisma.pushSubscription.create({
            data: {
                user_id: userId,
                platform: 'EXPO',
                expo_token: expoToken
            }
        });
    }

    async sendNotification(userId: string, payload: { title: string; message: string; data?: any }) {
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { user_id: userId, platform: 'EXPO', expo_token: { not: null } }
        });

        if (subscriptions.length === 0) return;

        const messages: ExpoPushMessage[] = [];
        for (const sub of subscriptions) {
            if (sub.expo_token && Expo.isExpoPushToken(sub.expo_token)) {
                messages.push({
                    to: sub.expo_token,
                    sound: 'default',
                    title: payload.title,
                    body: payload.message,
                    data: payload.data || {},
                });
            }
        }

        if (messages.length === 0) return;

        const chunks = expo.chunkPushNotifications(messages);
        const tickets: ExpoPushTicket[] = [];

        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                console.error('Error sending Expo push notifications chunk', error);
            }
        }

        this.checkReceiptsAndCleanTokens(tickets, messages);
    }

    private async checkReceiptsAndCleanTokens(tickets: ExpoPushTicket[], messages: ExpoPushMessage[]) {
        const receiptIds: string[] = [];
        const ticketToTokenMap = new Map<string, string>();

        for (let i = 0; i < tickets.length; i++) {
            const ticket = tickets[i];
            const token = messages[i].to as string;
            if (ticket.status === 'error') {
                if (ticket.details && ticket.details.error === 'DeviceNotRegistered') {
                    console.log(`Token ${token} is not registered anymore. Removing from DB.`);
                    this.removeTokenFromDb(token);
                }
            }
        }
    }

    private async removeTokenFromDb(expoToken: string) {
        try {
            await prisma.pushSubscription.delete({
                where: { expo_token: expoToken }
            });
        } catch (error) {
            console.error(`Failed to remove token ${expoToken} from DB:`, error);
        }
    }
}

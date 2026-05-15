import { Worker, Job } from 'bullmq';
import { redisConnection } from '../lib/redis';
import { NotificationService } from './notification.service';
import { notificationQueue } from '../types/notification.queue';

export { notificationQueue };

export let notificationWorker: Worker;

export const setupNotificationWorker = () => {
    
    notificationWorker = new Worker('notificationQueue', async (job: Job) => {
        
        const { getNotificationService } = require('../utils/notify/notification.helper');
        let notificationService;
        try {
            notificationService = getNotificationService();
        } catch (e) {
            notificationService = new NotificationService();
        }

        const { notificationId } = job.data;
        try {
            await notificationService.executeScheduledJob(notificationId);
        } catch (err) {
            throw err;
        }
    }, {
        connection: redisConnection,
        concurrency: 5
    });

    notificationWorker.on('completed', (job: Job) => {
        console.log(`[Worker] Job ${job.id} đã hoàn thành`);
    });

    notificationWorker.on('failed', (job: Job | undefined, err: Error) => {
        console.error(`[Worker] 🔴 Job ${job?.id} THẤT BẠI: ${err.message}`);
    });

    return notificationWorker;
};

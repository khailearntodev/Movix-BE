import { Queue, Worker, Job } from 'bullmq';
import { redisConnection } from '../lib/redis';
import { NotificationService } from './notification.service';
import { notificationQueue } from '../types/notification.queue';

export { notificationQueue };

export const notificationWorker = new Worker('notificationQueue', async (job: Job) => {
    const notificationService = new NotificationService();
    const { notificationId } = job.data;
    try {
        await notificationService.executeScheduledJob(notificationId);
    } catch (err) {
        console.error(`[Worker] Error in job ${job.id}:`, err);
        throw err;
    }
}, {
    connection: redisConnection
});

notificationWorker.on('completed', (job: Job) => {
    console.log(`[Worker] Job ${job.id} completed event triggered`);
});

notificationWorker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`[Worker] Job ${job?.id} FAILED with error: ${err.message}`);
});

notificationWorker.on('error', (err: Error) => {
    console.error(`[Worker] FATAL ERROR:`, err);
});

notificationQueue.on('error', (err: Error) => {
    console.error(`[Queue] FATAL ERROR:`, err);
});
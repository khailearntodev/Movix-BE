import {Queue, Worker} from 'bullmq';
import {redisConnection} from '../lib/redis';
import {NotificationService} from './notification.service';

export const notificationQueue = new Queue('notificationQueue', {
    connection: redisConnection
});

const notificationService = new NotificationService();

export const notificationWorker = new Worker('notificationQueue', async (job) => {
    const {notificationId} = job.data;
    await notificationService.executeScheduledJob(notificationId);
}, {
    connection: redisConnection
});

notificationWorker.on('completed', job => {
    console.log(`Job ${job.id} completed`);
}
)

notificationWorker.on('failed', (job, err) => {
    console.log(`Job ${job?.id} failed with error ${err}`);
})
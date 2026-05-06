import { Queue } from 'bullmq';
import { redisConnection } from '../lib/redis';

export const notificationQueue = new Queue('notificationQueue', {
    connection: redisConnection
});

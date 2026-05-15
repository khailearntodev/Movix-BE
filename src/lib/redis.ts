import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisConnection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
})

const redis = new Redis(redisUrl);

redisConnection.on('error', (err: any) => {
    console.error('❌ [Redis] BullMQ connection error:', err.message);
});

redis.on('error', (err: any) => {
    console.error('❌ [Redis] Default connection error:', err.message);
});

export default redis;
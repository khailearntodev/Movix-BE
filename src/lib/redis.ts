import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl);

redis.on('error', (err: any) => {
    console.error('Lỗi kết nối Redis:', err.message);
});

export default redis;
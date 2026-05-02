import { Prisma } from "@prisma/client"
import { prisma } from "../lib/prisma"
import redis from '../lib/redis';

export const getSystemRanks = async () => {
    const cachedRanks = await redis.get('RANK_THRESHOLDS');
    if (cachedRanks) {
        return JSON.parse(cachedRanks);
    }
    const ranks = await prisma.systemConfig.findUnique({
        where: { key: 'RANK_THRESHOLDS' },
        select: { value: true }
    });

    if (ranks && ranks.value) {
        await redis.set('RANK_THRESHOLDS', JSON.stringify(ranks.value));
    }

    return ranks ? ranks.value : null;
}

export const updateSystemRank = async (value: any) => {
    const updatedRank = await prisma.systemConfig.upsert({
        where: {
            key: 'RANK_THRESHOLDS'
        },
        update: {
            value: value as any
        },
        create: {
            key: 'RANK_THRESHOLDS',
            value: value as any,
            description: 'System ranks thresholds',
        }
    });
    await redis.set('RANK_THRESHOLDS', JSON.stringify(updatedRank.value));
    return updatedRank.value;
}

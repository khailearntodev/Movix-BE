import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import redis from "../lib/redis";

export const getSystemRanks = async () => {
  const cachedRanks = await redis.get("RANK_THRESHOLDS");
  if (cachedRanks) {
    return JSON.parse(cachedRanks);
  }
  const ranks = await prisma.systemConfig.findUnique({
    where: { key: "RANK_THRESHOLDS" },
    select: { value: true },
  });

  if (ranks && ranks.value) {
    await redis.set("RANK_THRESHOLDS", JSON.stringify(ranks.value));
  }

  return ranks ? ranks.value : null;
};

export const updateSystemRank = async (value: any) => {
  const updatedRank = await prisma.systemConfig.upsert({
    where: {
      key: "RANK_THRESHOLDS",
    },
    update: {
      value: value as any,
    },
    create: {
      key: "RANK_THRESHOLDS",
      value: value as any,
      description: "System ranks thresholds",
    },
  });
  await redis.set("RANK_THRESHOLDS", JSON.stringify(updatedRank.value));
  return updatedRank.value;
};

export const getAllAchievements = async (
  page: number,
  limit: number,
  isActive?: boolean,
) => {
  const skip = (page - 1) * limit;
  const whereCondition: any = {};
  if (isActive !== undefined) {
    whereCondition.isActive = isActive;
  }

  const [achievements, total] = await prisma.$transaction([
    prisma.achievement.findMany({
      where: whereCondition,
      skip: skip,
      take: limit,
      orderBy: { reward_xp: "desc" },
    }),
    prisma.achievement.count({ where: whereCondition }),
  ]);

  return {
    data: achievements,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const createAchievement = async (data: {
  name: string;
  description?: string;
  icon_url?: string;
  condition_type: string;
  condition_value: number;
  reward_xp: number;
  is_active?: boolean;
}) => {
    const existingAchievement = await prisma.achievement.findUnique({
        where: { name: data.name },
    });

    if (existingAchievement) {
        throw new Error("ACHIEVEMENT_ALREADY_EXISTS");
    }

    const achievement = await prisma.achievement.create({
        data: {
            name: data.name,
            description: data.description,
            icon_url: data.icon_url,
            condition_type: data.condition_type,
            condition_value: data.condition_value,
            reward_xp: data.reward_xp,
            is_active: data.is_active ?? true,
        },
    });
    return achievement;
};

export const updateAchievement = async (id: string, data: {
    name?: string;
    description?: string;
    icon_url?: string;
    condition_type?: string;
    condition_value?: number;
    reward_xp?: number;
    is_active?: boolean;
}) => {
    const achievement = await prisma.achievement.findUnique({
        where: { id },
    });

    if (!achievement) {
        throw new Error("ACHIEVEMENT_NOT_FOUND");
    }

    const updatedAchievement = await prisma.achievement.update({
        where: { id },
        data: {
            name: data.name,
            description: data.description,
            icon_url: data.icon_url,
            condition_type: data.condition_type,
            condition_value: data.condition_value,
            reward_xp: data.reward_xp,
            is_active: data.is_active,
        },    });
    return updatedAchievement;
};

export const toggleAchievement = async (id: string) => {
    const achievement = await prisma.achievement.findUnique({
        where: { id },
    });

    if (!achievement) {
        throw new Error("ACHIEVEMENT_NOT_FOUND");
    }

    const toggledAchievement = await prisma.achievement.update({
        where: { id },
        data: { is_active: !achievement.is_active },
    });
    return toggledAchievement;
};
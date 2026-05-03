import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getSystemRanks } from '../services/admin.gamification.service';

export const getMyGamificationProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Chưa xác thực.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        xp: true,
        total_watch_time: true,
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }

    const userAchievements = await prisma.userAchievement.findMany({
      where: { user_id: userId },
      include: {
        achievement: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_url: true,
            condition_type: true,
            condition_value: true,
            reward_xp: true,
          }
        }
      },
      orderBy: { unlocked_at: 'desc' }
    });

    const ranksConfig = await getSystemRanks();
    let currentRank = { key: "NEWBIE", name: "Mọt Phim", min_xp: 0 };
    let nextRank = null;

    if (ranksConfig) {
      const ranksArray = Object.entries(ranksConfig)
        .map(([key, value]: [string, any]) => ({ key, ...value }))
        .sort((a, b) => a.min_xp - b.min_xp);

      for (let i = 0; i < ranksArray.length; i++) {
        if (user.xp >= ranksArray[i].min_xp) {
          currentRank = ranksArray[i];
          if (i + 1 < ranksArray.length) {
            nextRank = ranksArray[i + 1];
          } else {
            nextRank = null;
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        xp: user.xp,
        total_watch_time: user.total_watch_time,
        current_rank: currentRank,
        next_rank: nextRank,
        achievements: userAchievements.map(ua => ({
          ...ua.achievement,
          unlocked_at: ua.unlocked_at
        }))
      }
    });

  } catch (error) {
    console.error("[GAMIFICATION] Lỗi khi lấy profile:", error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ.' });
  }
};

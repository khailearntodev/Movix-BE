import { prisma } from '../lib/prisma';
import { notificationService } from '../index';
import { NotificationType } from '../types/notification';

export const checkAndUnlockAchievements = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, total_watch_time: true, id: true }
    });

    if (!user) return;
    const activeAchievements = await prisma.achievement.findMany({
      where: { is_active: true }
    });

    if (activeAchievements.length === 0) return;

    const userAchievements = await prisma.userAchievement.findMany({
      where: { user_id: userId },
      select: { achievement_id: true }
    });

    const unlockedAchievementIds = new Set(userAchievements.map(ua => ua.achievement_id));

    let totalRewardXp = 0;
    const newlyUnlocked = [];

    for (const achievement of activeAchievements) {
      if (unlockedAchievementIds.has(achievement.id)) continue;

      let isUnlocked = false;
      if (achievement.condition_type === "XP") {
        if (user.xp >= achievement.condition_value) {
          isUnlocked = true;
        }
      } else if (achievement.condition_type === "TOTAL_WATCH_TIME" || achievement.condition_type === "WATCH_TIME") {
        if (user.total_watch_time >= achievement.condition_value) {
          isUnlocked = true;
        }
      }

      if (isUnlocked) {
        newlyUnlocked.push(achievement);
        totalRewardXp += achievement.reward_xp;

        await prisma.userAchievement.create({
          data: {
            user_id: userId,
            achievement_id: achievement.id,
          }
        });

        await notificationService.createNotification({
          userId: userId,
          type: NotificationType.ACHIEVEMENT_UNLOCKED,
          title: "🎉 Mở khóa thành tựu mới!",
          message: `Chúc mừng bạn đã nhận được thành tựu: ${achievement.name} (+${achievement.reward_xp} XP)`,
          data: { achievementId: achievement.id, icon_url: achievement.icon_url },
          actionUrl: '/profile/gamification'
        });
      }
    }

    if (totalRewardXp > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          xp: {
            increment: totalRewardXp
          }
        }
      });
    }

  } catch (error) {
    console.error("[GAMIFICATION] Lỗi khi check thành tựu cho user:", userId, error);
  }
};

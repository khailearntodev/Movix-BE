import { prisma } from "../lib/prisma";
import redis from "../lib/redis";
import { notificationService } from "../index";
import { NotificationType } from "../types/notification";
import { SubscriptionStatus } from "@prisma/client";
import cron from "node-cron";
import { USER_XP_BUFFER_KEY } from "../events/gamification.events";

export const startCronJobs = () => {
  console.log(
    "🚀 [SCHEDULER] Hệ thống lập lịch đã khởi động (Chế độ Interval và Cron)...",
  );

  runScheduleChecks();

  setInterval(() => {
    runScheduleChecks();
  }, 60000);

  cron.schedule("0 0 * * *", async () => {
    console.log("⏳ [CRON] Bắt đầu quét các gói cước hết hạn...");
    const result = await checkExpiredSubscriptions();
    console.log(`✅ [CRON] Quét hoàn tất: ${result?.message}`);
  });

  cron.schedule("*/5 * * * *", async () => {
    await flushGamificationXpBuffer();
  });
};
const runScheduleChecks = async () => {
  const now = new Date();

  try {
    await check30MinReminder();
    await checkStartReminder();
  } catch (error) {
    console.error(`[SCHEDULER ERROR]`, error);
  }
};

const check30MinReminder = async () => {
  const now = new Date();
  const targetTime = new Date(now.getTime() + 35 * 60000);

  const parties = await prisma.watchParty.findMany({
    where: {
      is_active: true,
      scheduled_at: {
        not: null,
        gt: now,
        lte: targetTime,
      },
      is_30m_notified: false,
    },
    include: {
      movie: true,
      reminders: true,
    },
  });

  if (parties.length > 0) {
    console.log(`✅ [30MIN CHECK] Tìm thấy ${parties.length} phòng cần báo.`);
  }

  for (const party of parties) {
    const userIds = party.reminders.map((r: any) => r.user_id);

    if (userIds.length > 0) {
      console.log(
        `🚀 [SENDING] Báo trước 30p cho phòng "${party.title}" tới ${userIds.length} user.`,
      );

      await notificationService.createBulkNotifications(userIds, {
        type: NotificationType.WATCH_PARTY_INVITE,
        title: "⏰ Sắp diễn ra: Phim chiếu sau 30 phút!",
        message: `Phòng chiếu "${party.title}" sẽ bắt đầu lúc ${new Date(party.scheduled_at!).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}.`,
        actionUrl: `/watch-party/${party.id}`,
      });
    } else {
      console.warn(
        `⚠️ [WARNING] Phòng "${party.title}" sắp chiếu nhưng không có ai đăng ký nhận tin.`,
      );
    }

    await prisma.watchParty.update({
      where: { id: party.id },
      data: { is_30m_notified: true },
    });
  }
};

const checkStartReminder = async () => {
  const now = new Date();

  const parties = await prisma.watchParty.findMany({
    where: {
      is_active: true,
      scheduled_at: { not: null, lte: now },
      is_start_notified: false,
    },
    include: {
      movie: true,
      reminders: true,
    },
  });

  if (parties.length > 0) {
    console.log(
      `✅ [START CHECK] Tìm thấy ${parties.length} phòng cần bắt đầu.`,
    );
  }

  for (const party of parties) {
    const userIds = party.reminders.map((r: any) => r.user_id);

    if (userIds.length > 0) {
      console.log(
        `🚀 [SENDING] Báo BẮT ĐẦU cho phòng "${party.title}" tới ${userIds.length} user.`,
      );

      await notificationService.createBulkNotifications(userIds, {
        type: NotificationType.WATCH_PARTY_INVITE,
        title: "🍿 Phim đã bắt đầu công chiếu!",
        message: `Phòng chiếu "${party.title}" đang bắt đầu. Vào xem ngay!`,
        actionUrl: `/watch-party/${party.id}`,
      });
    }

    await prisma.watchParty.update({
      where: { id: party.id },
      data: {
        is_start_notified: true,
        started_at: new Date(),
      },
    });
  }
};

const flushGamificationXpBuffer = async () => {
  try {
    const buffer = await redis.hgetall(USER_XP_BUFFER_KEY);
    const entries = Object.entries(buffer);

    if (entries.length === 0) {
      return;
    }

    for (const [userId, xpValue] of entries) {
      const xp = Number(xpValue);

      if (!Number.isFinite(xp) || xp <= 0) {
        continue;
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          xp: {
            increment: xp,
          },
        },
      });
    }

    await redis.del(USER_XP_BUFFER_KEY);
  } catch (error) {
    console.error("[GAMIFICATION CRON] Lỗi đồng bộ XP:", error);
  }
};

export const checkExpiredSubscriptions = async () => {
  try {
    const now = new Date();

    const result = await prisma.userSubscription.updateMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        end_date: {
          lt: now, 
        },
      },
      data: {
        status: SubscriptionStatus.EXPIRED,
      },
    });

    return {
      success: true,
      expiredCount: result.count,
      message: `Đã quét và chuyển ${result.count} gói cước sang trạng thái EXPIRED.`,
    };
  } catch (error) {
    console.error("[GAMIFICATION CRON] Lỗi nghiêm trọng khi quét gói cước hết hạn:", error);

    return {
      success: false,
      expiredCount: 0,
      message: "Có lỗi xảy ra trong quá trình quét dữ liệu.",
      error: error,
    };
  }
};
import { prisma } from '../lib/prisma';
import { ReportTargetType } from '@prisma/client';
import { getSystemRanks } from './admin.gamification.service';

export const createReport = async (
  reporterId: string,
  targetType: ReportTargetType,
  targetId: string,
  reason: string
) => {
  let priorityLevel = 0;
  try {
    const user = await prisma.user.findUnique({ where: { id: reporterId }, select: { xp: true } });
    if (user) {
      const ranksConfig = await getSystemRanks();
      if (ranksConfig && ranksConfig.LEGEND && user.xp >= ranksConfig.LEGEND.min_xp) {
        priorityLevel = 99;
      }
    }
  } catch (error) {
    console.error("Error setting report priority:", error);
  }

  return await prisma.report.create({
    data: {
      reporter_id: reporterId,
      target_type: targetType,
      target_id: targetId,
      reason,
      priority_level: priorityLevel,
    },
  });
};

import { prisma } from '../lib/prisma';
import { ReportTargetType } from '@prisma/client';

export const createReport = async (
  reporterId: string,
  targetType: ReportTargetType,
  targetId: string,
  reason: string
) => {
  return await prisma.report.create({
    data: {
      reporter_id: reporterId,
      target_type: targetType,
      target_id: targetId,
      reason,
    },
  });
};

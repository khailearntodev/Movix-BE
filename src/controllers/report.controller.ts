import { Request, Response } from 'express';
import * as reportService from '../services/report.service';
import { ReportTargetType } from '@prisma/client';

const getUserId = (req: Request) => (req as any).userId as string;

export const submitReport = async (req: Request, res: Response) => {
  try {
    const reporterId = getUserId(req);
    const { targetType, targetId, reason } = req.body;

    if (!reporterId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ message: 'Missing required fields (targetType, targetId, reason)' });
    }
    const validTargetTypes = Object.values(ReportTargetType);
    if (!validTargetTypes.includes(targetType as ReportTargetType)) {
      return res.status(400).json({ message: 'Invalid target type' });
    }

    const report = await reportService.createReport(
      reporterId,
      targetType as ReportTargetType,
      targetId,
      reason
    );

    res.status(201).json({ message: 'Báo cáo thành công', report });
  } catch (error: any) {
    console.error('Error submitting report:', error);
    res.status(500).json({ message: 'Lỗi khi gửi báo cáo', error: error.message });
  }
};

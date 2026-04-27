import { Request, Response } from 'express';
import * as adminReportService from '../services/admin.report.service';
import { ReportStatus } from '@prisma/client';

export const getReports = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const take = parseInt(req.query.take as string) || 15;
    const search = (req.query.q as string) || '';
    const filterStatus = (req.query.status as string) || 'ALL';
    const targetType = (req.query.targetType as string) || 'ALL';

    const result = await adminReportService.getAllReports(page, take, search, filterStatus, targetType);
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Lỗi lấy danh sách báo cáo', error: error.message });
  }
};

export const updateReportStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, resolutionNote } = req.body;
    const resolverId = (req as any).userId; // assumes authenticated route

    if (!Object.values(ReportStatus).includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    const updatedReport = await adminReportService.updateReportStatus(id, resolverId, status, resolutionNote);
    res.json({ message: 'Cập nhật thành công', result: updatedReport });
  } catch (error: any) {
    console.error('Error updating report status:', error);
    res.status(500).json({ message: 'Lỗi cập nhật trạng thái báo cáo', error: error.message });
  }
};

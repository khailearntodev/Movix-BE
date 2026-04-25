import { Response } from 'express';
import { DownloadService } from '../services/download.service';

export const requestDownload = async (req: any, res: Response) => {
  try {
    console.log('--- [API: requestDownload] START ---');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    
    // const isMobile = req.headers['x-app-platform'] === 'mobile';
    // if (!isMobile) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Tính năng tải xuống chỉ hỗ trợ trên thiết bị di động.',
    //   });
    // }

    const { episodeId, deviceId } = req.body;
    console.log(' Parsed Variables -> episodeId:', episodeId, '| deviceId:', deviceId);

    if (!episodeId || !deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Yêu cầu cung cấp deviceId và episodeId.',
      });
    }

    console.log('req.userId:', req.userId);
    const userId = req.userId;
    if (!userId) {
       return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await DownloadService.requestDownload(userId, deviceId, episodeId);
    
    return res.status(200).json({
      success: true,
      message: 'Lấy thông tin tải xuống thành công',
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi yêu cầu tải xuống',
    });
  }
};

export const completeDownload = async (req: any, res: Response) => {
  try {
    const downloadId = req.params.id;
    const { filePath } = req.body;
    const userId = req.userId;
    
    if (!userId) {
       return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await DownloadService.completeDownload(userId, downloadId, filePath);
    return res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái thành công',
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi cập nhật trạng thái',
    });
  }
};

export const removeDownload = async (req: any, res: Response) => {
  try {
    const downloadId = req.params.id;
    const userId = req.userId;
    
    if (!userId) {
       return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await DownloadService.removeDownload(userId, downloadId);
    return res.status(200).json({
      success: true,
      message: 'Xoá video tải xuống thành công',
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi xoá video tải xuống',
    });
  }
};

export const getListDownloads = async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    const { deviceId } = req.query; // optional filter
    
    if (!userId) {
       return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const downloads = await DownloadService.getUserDownloads(userId, deviceId as string);
    return res.status(200).json({
      success: true,
      data: downloads,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi lấy danh sách',
    });
  }
};
import { Request, Response } from 'express';
import * as historyService from '../services/history.service';

export const historyController = {
    syncProgress: async (req: Request, res: Response) => {
        try {
            const userId = req.userId!;
            const { episodeId, progress, isFinished } = req.body;

            if (!episodeId) {
                return res.status(400).json({ message: 'Thiếu episodeId' });
            }

            await historyService.upsertWatchHistory(
                userId,
                episodeId,
                progress || 0,
                isFinished || false
            );

            res.status(200).json({ success: true });
        } catch (error) {
            console.error('Sync History Error:', error);
            res.status(500).json({ message: 'Lỗi lưu lịch sử xem' });
        }
    },

    getMyHistory: async (req: Request, res: Response) => {
        try {
            const userId = req.userId!;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const result = await historyService.getWatchHistory(userId, page, limit);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ message: 'Lỗi lấy lịch sử xem' });
        }
    }
};
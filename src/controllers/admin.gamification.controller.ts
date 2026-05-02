import {Request, Response} from "express"
import * as adminGamificationService from "../services/admin.gamification.service"

export const adminGamificationController = {
    getSystemRanks: async (req: Request, res: Response) => {
        try {
            const ranks = await adminGamificationService.getSystemRanks();
            res.status(200).json({success: true, message: "Lấy danh sách ranks thành công", ranks});
        } catch (error: any) {
            console.error(error);
            res.status(500).json({success: false, message: "Lỗi lấy danh sách ranks", error: error.message });
        }
    },
    updateSystemRank: async (req: Request, res: Response) => {
        if (!req.body || !req.body.NEWBIE || !req.body.LEGEND) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ. Vui lòng cung cấp đủ các mốc hạng.'
            });
        }
        try {
            const ranks = await adminGamificationService.updateSystemRank(req.body);
            res.status(200).json({success: true, message: "Cập nhật ranks thành công", ranks});
        } catch (error: any) {
            console.error(error);
            res.status(500).json({success: false, message: "Lỗi cập nhật ranks", error: error.message});
        }
    },
}

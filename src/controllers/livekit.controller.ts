import { Request, Response } from "express";
import { LiveKitService } from "../services/livekit.service";

const liveKitService = new LiveKitService();

export const generateAccessToken = async (req: Request, res: Response) => {
    try {
        const roomId = req.query.roomId as string;
        if (!roomId) {
            return res.status(400).json({ message: "Thiếu roomId" });
        }
        const userId = req.userId as string;
        const token = await liveKitService.generateAccessToken(roomId, userId);
        res.json({ token });
    } catch (error: any) {
        console.error("Lỗi tạo AccessToken:", error.message);
        
        if (error.message.includes('Không tìm thấy phòng')) {
            return res.status(404).json({ message: error.message });
        }
        if (error.message.includes('không được bật')) {
            return res.status(403).json({ message: error.message });
        }
        if (error.message.includes('đã kết thúc')) {
            return res.status(403).json({ message: error.message });
        }
        
        res.status(500).json({ message: error.message || "Lỗi tạo token" });
    }
};

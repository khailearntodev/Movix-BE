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
    } catch (error) {
        console.error("Lỗi tạo AccessToken:", error);
        if (error instanceof Error) {
            if (error.message.includes('Không tìm thấy người dùng')) {
                return res.status(404).json({ message: "Không tìm thấy người dùng" });
            }
            if (error.message.includes('Không tìm thấy phòng')) {
                return res.status(404).json({ message: "Không tìm thấy phòng hoặc phòng không hỗ trợ voice chat" });
            }
        }
        res.status(500).json({ message: "Lỗi tạo token" });
    }
};

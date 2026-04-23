import { Request, Response } from 'express';
import * as aiService from '../services/ai.service';
import { checkAIFeatureLimit, searchMoviesByImage } from '../services/ai.service';

export const checkLimit = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const type = (req.query.type as 'CHAT' | 'SEARCH') || 'CHAT';
    const limitCheck = await aiService.checkAIFeatureLimit(userId, type);
    res.json({
      remaining: limitCheck.remaining === -1 ? -1 : limitCheck.remaining,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi kiểm tra giới hạn AI" });
  }
};

export const chat = async (req: Request, res: Response) => {
  try {
    const { message, mode } = req.body;
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!message) return res.status(400).json({ message: "Thiếu nội dung chat" });

    const limitCheck = await aiService.checkAIFeatureLimit(userId, 'CHAT');

    if (!limitCheck.allowed) {
      return res.status(403).json({
        message:
          "Bạn đã đạt giới hạn sử dụng AI trong ngày. Vui lòng nâng cấp gói để tiếp tục.",
      });
    }

    const botReply = await aiService.chatWithAI(userId, message);
    const currentRemaining =
      limitCheck.remaining > 0 ? limitCheck.remaining - 1 : 0;
    res.json({
      reply: botReply,
      remaining: limitCheck.remaining === -1 ? -1 : currentRemaining,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi xử lý AI" });
  }
};

export const searchMovies = async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!query) return res.status(400).json({ message: "Thiếu mô tả phim" });

    const limitCheck = await aiService.checkAIFeatureLimit(userId, 'SEARCH');
    if (!limitCheck.allowed) {
      return res.status(403).json({
        message:
          "Bạn đã đạt giới hạn sử dụng AI trong ngày. Vui lòng nâng cấp gói để tiếp tục.",
      });
    }

    const movies = await aiService.searchMoviesByAI(query, 5, userId);

    const currentRemaining =
      limitCheck.remaining > 0 ? limitCheck.remaining - 1 : 0;

    res.json({
      data: movies,
      remaining: limitCheck.remaining === -1 ? -1 : currentRemaining,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi tìm kiếm AI" });
  }
};

export const searchMoviesVoice = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!req.file) {
      return res.status(400).json({ message: "Không tìm thấy file ghi âm" });
    }

    const limitCheck = await aiService.checkAIFeatureLimit(userId, 'SEARCH');
    if (!limitCheck.allowed) {
      return res.status(403).json({
        message:
          "Bạn đã đạt giới hạn sử dụng AI trong ngày. Vui lòng nâng cấp gói để tiếp tục.",
      });
    }

    const audioBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;

    const result = await aiService.searchMoviesByVoice(
      audioBuffer,
      mimeType,
      userId,
    );
    const currentRemaining =
      limitCheck.remaining > 0 ? limitCheck.remaining - 1 : 0;

    res.json({
      data: result.movies,
      recognizedText: result.recognizedText,
      remaining: limitCheck.remaining === -1 ? -1 : currentRemaining,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi xử lý tìm kiếm giọng nói" });
  }
};

export const searchImage = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "Vui lòng upload hình ảnh" });
    }

    const limitCheck = await aiService.checkAIFeatureLimit(userId, 'SEARCH');
    if (!limitCheck.allowed) {
      return res.status(403).json({
        message:
          "Bạn đã đạt giới hạn sử dụng AI trong ngày. Vui lòng nâng cấp gói để tiếp tục.",
      });
    }

    const results = await aiService.searchMoviesByImage(
      file.buffer,
      file.mimetype,
      userId,
    );

    const currentRemaining =
      limitCheck.remaining > 0 ? limitCheck.remaining - 1 : 0;

    return res.status(200).json({
      message: "Tìm kiếm thành công",
      data: results,
      remaining: limitCheck.remaining === -1 ? -1 : currentRemaining,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Lỗi server khi tìm kiếm bằng ảnh" });
  }
};
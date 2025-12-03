import { Request, Response } from 'express';
import * as aiService from '../services/ai.service';

export const chat = async (req: Request, res: Response) => {
  try {
    const { message, mode } = req.body;
    const userId = req.userId; 
    
    if (!message) return res.status(400).json({ message: "Thiếu nội dung chat" });

    const botReply = await aiService.chatWithAI(message, userId, mode === 'raw');
    res.json({ reply: botReply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi xử lý AI" });
  }
};

export const searchMovies = async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ message: "Thiếu mô tả phim" });

    const movies = await aiService.searchMoviesByAI(query);
    res.json(movies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi tìm kiếm AI" });
  }
};

export const searchMoviesVoice = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Không tìm thấy file ghi âm" });
    }

    const audioBuffer = req.file.buffer;
    const mimeType = req.file.mimetype; 

    const movies = await aiService.searchMoviesByVoice(audioBuffer, mimeType);
    res.json(movies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi xử lý tìm kiếm giọng nói" });
  }
};
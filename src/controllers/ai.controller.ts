import { Request, Response } from 'express';
import * as aiService from '../services/ai.service';

export const chat = async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    const userId = req.userId; 
    
    if (!message) return res.status(400).json({ message: "Thiếu nội dung chat" });

    const botReply = await aiService.chatWithAI(message, userId);
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
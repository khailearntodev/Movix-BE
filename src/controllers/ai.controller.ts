import { Request, Response } from 'express';
import * as aiService from '../services/ai.service';
import { searchMoviesByImage } from '../services/ai.service';

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

    const result = await aiService.searchMoviesByVoice(audioBuffer, mimeType);
    res.json({
        data: result.movies,
        recognizedText: result.recognizedText
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi xử lý tìm kiếm giọng nói" });
  }
};

export const searchImage = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "Vui lòng upload hình ảnh" });
    }

    const results = await searchMoviesByImage(file.buffer, file.mimetype);
    
    return res.status(200).json({ 
      message: "Tìm kiếm thành công", 
      data: results 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server khi tìm kiếm bằng ảnh" });
  }
};
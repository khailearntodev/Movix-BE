import { Request, Response } from 'express';
import { homepageService } from '../services/homepage.service';

export const homepageController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const sections = await homepageService.getAllSections();
      res.json(sections);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server' });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { title, displayOrder } = req.body;
      const newSection = await homepageService.createSection(title, displayOrder);
      res.json(newSection);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi tạo section' });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updated = await homepageService.updateSection(id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi cập nhật section' });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await homepageService.deleteSection(id);
      res.json({ message: 'Đã xóa' });
    } catch (error) {
      res.status(500).json({ message: 'Lỗi xóa section' });
    }
  },

  addMovie: async (req: Request, res: Response) => {
    try {
      const { sectionId, movieId, displayOrder } = req.body;
      const link = await homepageService.addMovieToSection(sectionId, movieId, displayOrder);
      res.json(link);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi thêm phim' });
    }
  },

  removeMovie: async (req: Request, res: Response) => {
    try {
      const { sectionId, linkId } = req.params; 
      await homepageService.removeMovieFromSection(sectionId, linkId);
      res.json({ message: 'Đã xóa phim khỏi section' });
    } catch (error) {
      res.status(500).json({ message: 'Lỗi xóa phim' });
    }
  },

  reorderSections: async (req: Request, res: Response) => {
    try {
      const { items } = req.body; 
      await homepageService.reorderSections(items);
      res.json({ message: 'Sắp xếp thành công' });
    } catch (error) {
      res.status(500).json({ message: 'Lỗi sắp xếp' });
    }
  },

  reorderMovies: async (req: Request, res: Response) => {
    try {
      const { items } = req.body; 
      await homepageService.reorderMovies(items);
      res.json({ message: 'Sắp xếp phim thành công' });
    } catch (error) {
      res.status(500).json({ message: 'Lỗi sắp xếp phim' });
    }
  }
};
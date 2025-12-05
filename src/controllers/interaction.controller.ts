import { Request, Response } from 'express';
import * as interactService from '../services/interaction.service';

const getUserId = (req: Request) => req.userId as string;

export const interactionController = {
  toggleFavorite: async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { movieId } = req.body;
      if (!movieId) {
        return res.status(400).json({ message: 'Phải có movieId' });
      }
      const isFavorited = await interactService.toggleFavorite(userId, movieId);
      res.status(200).json({
        message: isFavorited
          ? 'Đã thêm vào yêu thích.'
          : 'Đã xóa khỏi yêu thích.',
        isFavorited,
      });
    } catch (error) {
      res.status(500).json({ message: 'Lỗi máy chủ' });
    }
  },

  getFavoriteMovies: async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const favorites = await interactService.getFavoriteMovies(userId);
      res.status(200).json(favorites.map(fav => fav.movie)); 
    } catch (error) {
      res.status(500).json({ message: 'Lỗi máy chủ' });
    }
  },
  
  checkFavoriteStatus: async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { movieId } = req.query;
      if (!movieId) {
        return res.status(400).json({ message: 'Phải có movieId' });
      }
      const isFavorite = await interactService.checkFavoriteStatus(userId, movieId as string);
      res.status(200).json({ isFavorite });
    } catch (error) {
      res.status(500).json({ message: 'Lỗi máy chủ' });
    }
  },

  getPlaylists: async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const playlists = await interactService.getPlaylists(userId);
      res.status(200).json(playlists);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi máy chủ' });
    }
  },

  // Lấy chi tiết playlist
  getPlaylistDetail: async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      
      const playlistDetail = await interactService.getPlaylistDetail(userId, id);
      res.status(200).json(playlistDetail);
    } catch (error: any) {
      if (error.message === 'PLAYLIST_NOT_FOUND') {
        return res.status(404).json({ message: 'Không tìm thấy playlist này.' });
      }
      res.status(500).json({ message: 'Lỗi máy chủ' });
    }
  },

  createPlaylist: async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { name } = req.body;
      if (!name) {
         return res.status(400).json({ message: 'Tên playlist là bắt buộc.' });
      }
      const newPlaylist = await interactService.createPlaylist(userId, name);
      res.status(201).json(newPlaylist);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi máy chủ' });
    }
  },
  
  addMovieToPlaylist: async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { playlistId, movieId } = req.body;
      if (!playlistId || !movieId) {
         return res.status(400).json({ message: 'playlistId và movieId là bắt buộc.' });
      }
      await interactService.addMovieToPlaylist(userId, playlistId, movieId);
      res.status(200).json({ message: 'Đã thêm phim vào playlist.' });
    } catch (error: any) {
       if (error.message === 'PLAYLIST_NOT_FOUND') {
         return res.status(404).json({ message: 'Không tìm thấy playlist hoặc bạn không có quyền.' });
       }
       if (error.message === 'MOVIE_ALREADY_IN_PLAYLIST') {
         return res.status(409).json({ message: 'Phim đã có trong playlist này.' });
       }
      res.status(500).json({ message: 'Lỗi máy chủ' });
    }
  },

  // Xóa phim khỏi playlist
  removeMovieFromPlaylist: async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { id, movieId } = req.params; 

      await interactService.removeMovieFromPlaylist(userId, id, movieId);
      res.status(200).json({ message: 'Đã xóa phim khỏi playlist.' });
    } catch (error: any) {
      if (error.message === 'PLAYLIST_NOT_FOUND') {
        return res.status(404).json({ message: 'Không tìm thấy playlist.' });
      }
      if (error.message === 'MOVIE_NOT_IN_PLAYLIST') {
        return res.status(404).json({ message: 'Phim không có trong playlist này.' });
      }
      res.status(500).json({ message: 'Lỗi máy chủ' });
    }
  }
};
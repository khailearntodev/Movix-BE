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
  },
  rateMovie: async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { movieId, rating } = req.body;

      if (!movieId || rating === undefined) {
        return res.status(400).json({ message: 'Thiếu movieId hoặc điểm đánh giá.' });
      }

      const result = await interactService.upsertRating(userId, movieId, Number(rating));
      res.status(200).json({ message: 'Đánh giá thành công.', data: result });
    } catch (error: any) {
      if (error.message === 'INVALID_RATING_VALUE') {
        return res.status(400).json({ message: 'Điểm đánh giá phải từ 1 đến 10.' });
      }
      res.status(500).json({ message: 'Lỗi máy chủ.' });
    }
  },

  // GET /api/interact/rating/my-rate?movieId=...
  getMyRating: async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { movieId } = req.query;

      if (!movieId) {
        return res.status(400).json({ message: 'Thiếu movieId.' });
      }

      const rating = await interactService.getUserRating(userId, movieId as string);
      
      res.status(200).json({ 
        hasRated: !!rating,
        rating: rating ? rating.rating : null 
      });
    } catch (error) {
      res.status(500).json({ message: 'Lỗi máy chủ.' });
    }
  },

  // DELETE /api/interact/rating/:movieId
  deleteRating: async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { movieId } = req.params;

      await interactService.deleteRating(userId, movieId);
      res.status(200).json({ message: 'Đã xóa đánh giá.' });
    } catch (error: any) {
      if (error.message === 'RATING_NOT_FOUND') {
        return res.status(404).json({ message: 'Bạn chưa đánh giá phim này.' });
      }
      res.status(500).json({ message: 'Lỗi máy chủ.' });
    }
  },

  // GET /api/interact/rating/stats/:movieId
  getMovieRatingStats: async (req: Request, res: Response) => {
    try {
      const { movieId } = req.params;
      const stats = await interactService.getMovieRatingStats(movieId);
      res.status(200).json(stats);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi máy chủ.' });
    }
  },
  getMovieRatings: async (req: Request, res: Response) => {
    try {
      const { movieId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!movieId) {
        return res.status(400).json({ message: 'Thiếu movieId.' });
      }

      const result = await interactService.getMovieRatings(movieId, page, limit);
      res.status(200).json(result);
    } catch (error) {
      console.error('Get movie ratings error:', error);
      res.status(500).json({ message: 'Lỗi máy chủ.' });
    }
  },
};

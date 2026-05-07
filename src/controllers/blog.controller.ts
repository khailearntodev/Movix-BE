import { Request, Response } from 'express';
import * as blogService from '../services/blog.service';
import { generateSlug } from '../utils/slug.util';

const getUserId = (req: Request) => req.userId as string;

export const blogController = {
  createPost: async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { title, content, excerpt, isSpoiler, movieId, status } = req.body;

      if (!title || !content) {
        return res.status(400).json({ message: 'Tiêu đề và nội dung là bắt buộc' });
      }
      let slug = generateSlug(title);

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      let thumbnail = req.body.thumbnail; 
      let images = req.body.images ? (Array.isArray(req.body.images) ? req.body.images : [req.body.images]) : [];

      if (files) {
        if (files['thumbnail'] && files['thumbnail'].length > 0) {
          thumbnail = files['thumbnail'][0].path;
        }
        if (files['images'] && files['images'].length > 0) {
          const uploadedImagesUrls = files['images'].map(file => file.path);
          images = [...images, ...uploadedImagesUrls];
        }
      }

      const post = await blogService.createBlogPost({
        user_id: userId,
        title,
        slug,
        content,
        excerpt: excerpt || null,
        thumbnail: thumbnail || null,
        images: images,
        is_spoiler: isSpoiler === 'true' || isSpoiler === true,
        movie_id: movieId && movieId !== 'null' && movieId !== 'undefined' ? movieId : null,
        status: status || 'PUBLISHED',
      });

      res.status(201).json({
        message: 'Tạo bài viết thành công',
        data: post,
      });
    } catch (error: any) {
      console.error('Lỗi tạo bài viết:', error);
      res.status(500).json({ message: 'Lỗi máy chủ', error: String(error) });
    }
  },

  getPostById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const post = await blogService.getBlogPostById(id);

      if (!post) {
        return res.status(404).json({ message: 'Bài viết không tồn tại' });
      }

      res.status(200).json({
        data: post,
      });
    } catch (error) {
      console.error('Lỗi lấy bài viết:', error);
      res.status(500).json({ message: 'Lỗi máy chủ' });
    }
  },

  getPostBySlug: async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;

      const post = await blogService.getBlogPostBySlug(slug);

      if (!post) {
        return res.status(404).json({ message: 'Bài viết không tồn tại' });
      }

      res.status(200).json({
        data: post,
      });
    } catch (error) {
      console.error('Lỗi lấy bài viết:', error);
      res.status(500).json({ message: 'Lỗi máy chủ' });
    }
  },

  getAllPosts: async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10, movieId, userId, isSpoiler, search } = req.query;

      const result = await blogService.getAllBlogPosts(
        parseInt(page as string) || 1,
        parseInt(limit as string) || 10,
        {
          movieId: movieId as string,
          userId: userId as string,
          isSpoiler: isSpoiler === 'true' ? true : isSpoiler === 'false' ? false : undefined,
          search: search as string,
        }
      );

      res.status(200).json({
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: result.pages,
        },
      });
    } catch (error) {
      console.error('Lỗi lấy danh sách bài viết:', error);
      res.status(500).json({ message: 'Lỗi máy chủ' });
    }
  },

  getUserPosts: async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const currentUserId = getUserId(req);

      const includePrivate = currentUserId === userId;

      const result = await blogService.getUserBlogPosts(
        userId,
        parseInt(page as string) || 1,
        parseInt(limit as string) || 10,
        includePrivate
      );

      res.status(200).json({
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: result.pages,
        },
      });
    } catch (error) {
      console.error('Lỗi lấy bài viết của người dùng:', error);
      res.status(500).json({ message: 'Lỗi máy chủ' });
    }
  },
};

export default blogController;

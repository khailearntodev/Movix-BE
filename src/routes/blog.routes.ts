import express from 'express';
import { blogController } from '../controllers/blog.controller';
import { authenticateToken, optionalAuthenticateToken } from '../middlewares/auth.middleware';
import uploadCloud from '../config/cloudinary.config';

const router = express.Router();

// GET /api/blogs 
router.get('/', optionalAuthenticateToken, blogController.getAllPosts);

// GET /api/blogs/:id 
router.get('/id/:id', optionalAuthenticateToken, blogController.getPostById);

// GET /api/blogs/slug/:slug 
router.get('/slug/:slug', optionalAuthenticateToken, blogController.getPostBySlug);

// GET /api/blogs/user/:userId 
router.get('/user/:userId', optionalAuthenticateToken, blogController.getUserPosts);

router.use(authenticateToken);

// POST /api/blogs 
router.post(
  '/',
  (req, res, next) => {
    uploadCloud.fields([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'images', maxCount: 10 }
    ])(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ message: 'Lỗi upload file', error: err.message });
      }
      next();
    });
  },
  blogController.createPost
);

// PUT /api/blogs/:id
router.put(
  '/:id',
  (req, res, next) => {
    uploadCloud.fields([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'images', maxCount: 10 }
    ])(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ message: 'Lỗi upload file', error: err.message });
      }
      next();
    });
  },
  blogController.updatePost
);

// DELETE /api/blogs/:id
router.delete('/:id', blogController.deletePost);

// POST /api/blogs/:id/like
router.post('/:id/like', blogController.toggleLike);

// POST /api/blogs/:id/bookmark
router.post('/:id/bookmark', blogController.toggleBookmark);

// GET /api/blogs/bookmarks
router.get('/bookmarks', blogController.getSavedBlogs)

export default router;

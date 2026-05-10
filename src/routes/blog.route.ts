import express from 'express';
import { blogController } from '../controllers/blog.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import uploadCloud from '../config/cloudinary.config';

const router = express.Router();

// GET /api/blogs 
router.get('/', blogController.getAllPosts);

// GET /api/blogs/:id 
router.get('/id/:id', blogController.getPostById);

// GET /api/blogs/slug/:slug 
router.get('/slug/:slug', blogController.getPostBySlug);

// GET /api/blogs/user/:userId 
router.get('/user/:userId', blogController.getUserPosts);

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

export default router;

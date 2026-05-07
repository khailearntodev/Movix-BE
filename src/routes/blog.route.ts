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

export default router;

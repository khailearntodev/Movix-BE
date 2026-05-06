import express from 'express';
import { blogController } from '../controllers/blog.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

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
router.post('/', blogController.createPost);

export default router;

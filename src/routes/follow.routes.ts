import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { followController } from '../controllers/follow.controller';

const router = express.Router();
router.use(authenticateToken);

// POST /api/follow/:followingId
router.post('/:followingId', followController.followUser);

// DELETE /api/follow/:followingId
router.delete('/:followingId', followController.unFollowUser);

// GET /api/follow/followings
router.get('/followings', followController.getMyFollowings);

// GET /api/follow/followers
router.get('/followers', followController.getMyFollowers);

export default router;
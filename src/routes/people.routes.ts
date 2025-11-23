import { Router } from 'express';
import { personController } from '../controllers/people.controller';

const router = Router();

// GET /api/people
// Query params: ?page=1&limit=20&q=Tom&role=actor
router.get('/', personController.getAll);

// GET /api/people/:id
router.get('/:id', personController.getDetail);

export default router;
import { Router } from 'express';
import { personController } from '../controllers/people.controller';

const router = Router();

// GET /api/people
router.get('/', personController.getAll);

// Lấy chi tiết nhân sự theo ID
router.get('/:id', personController.getDetail);

// POST /api/people
router.post('/', personController.create);

// PUT /api/people/:id
router.put('/:id', personController.update);

// DELETE /api/people/:id
router.delete('/:id', personController.delete);

export default router;
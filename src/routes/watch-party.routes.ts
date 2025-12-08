import { Router } from 'express';
import { watchPartyController } from '../controllers/watch-party.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticateToken);

// 1. Lấy danh sách phòng (Sảnh chờ)
router.get('/', watchPartyController.getAll);

// 2. Tạo phòng mới
router.post('/', watchPartyController.create);

// 3. Đăng ký nhận thông báo phim sắp chiếu
router.post('/:id/remind', watchPartyController.toggleReminder);

// 4. Kết thúc phòng (chỉ host mới có quyền)
router.put('/:id/end', watchPartyController.end);

// 5. Hủy phòng sắp chiếu (chỉ host mới có quyền)
router.delete('/:id', watchPartyController.cancel);

export default router;
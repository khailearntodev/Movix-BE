import { Router } from 'express';
import { watchPartyController } from '../controllers/watch-party.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticateToken);

// 1. Lấy danh sách phòng (Sảnh chờ)
router.get('/', watchPartyController.getAll);

// 2. Tạo phòng mới
router.post('/', watchPartyController.create);

// 3. Tìm phòng bằng mã code
router.post('/join', watchPartyController.joinByCode);

// 4. Đăng ký nhận thông báo phim sắp chiếu
router.post('/:id/remind', watchPartyController.toggleReminder);

// 5. Kết thúc phòng (chỉ host mới có quyền)
router.put('/:id/end', watchPartyController.end);

// 6. Hủy phòng sắp chiếu (chỉ host mới có quyền)
router.delete('/:id', watchPartyController.cancel);

// 7. Lấy chi tiết phòng để tham gia
router.get('/:id', watchPartyController.getDetails);

export default router;
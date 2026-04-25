import { Router } from 'express';
import { watchPartyController } from '../controllers/watch-party.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticateToken);

// 1. Lấy danh sách phòng (Sảnh chờ)
router.get('/', watchPartyController.getAll);

//2. Lấy Stats cho các thẻ quản lý của admin
router.get('/stats', watchPartyController.getStats);

// 3. Tạo phòng mới
router.post('/', watchPartyController.create);

// 4. Tìm phòng bằng mã code
router.post('/join', watchPartyController.joinByCode);

// 5. Đăng ký nhận thông báo phim sắp chiếu
router.post('/:id/remind', watchPartyController.toggleReminder);

// 6. Kết thúc phòng (chỉ host mới có quyền)
router.put('/:id/end', watchPartyController.end);

// 7. Hủy phòng sắp chiếu (chỉ host mới có quyền)
router.delete('/:id', watchPartyController.cancel);

// 8. Lấy chi tiết phòng để tham gia
router.get('/:id', watchPartyController.getDetails);

// 9. Lấy chi tiết phòng để quản lý
router.get('/manage/:id', watchPartyController.getDetailsById);

//10. Ban user khỏi phòng (chỉ host hoặc admin mới có quyền)
router.patch('/ban/:id', watchPartyController.banUser);

//11. Mute user trong phòng
router.patch('/mute/:id', watchPartyController.muteUser);

export default router;

import express from 'express';
import * as subscriptionPlanController from '../controllers/subscription-plan.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = express.Router();

// ==================== PUBLIC ROUTES ====================
// PUBLIC - Lấy danh sách gói đăng ký đang hoạt động (cho mọi người xem, không bắt buộc login)
router.get('/', subscriptionPlanController.getAllSubscriptionPlans);

// Lấy chi tiết gói đăng ký theo ID
router.get('/:id', subscriptionPlanController.getSubscriptionPlanById);


// ==================== ADMIN ROUTES ====================
// Áp dụng authentication cho các operation thay đổi dữ liệu
router.use(authenticateToken);

// CREATE - Tạo mới gói đăng ký 
router.post('/', subscriptionPlanController.createSubscriptionPlan);

// UPDATE - Cập nhật gói đăng ký
router.put('/:id', subscriptionPlanController.updateSubscriptionPlan);

// UPDATE - Vô hiệu hóa gói đăng ký
router.patch('/:id/deactivate', subscriptionPlanController.deactivateSubscriptionPlan);

// UPDATE - Kích hoạt lại gói đăng ký
router.patch('/:id/activate', subscriptionPlanController.activateSubscriptionPlan);

// DELETE - Xóa gói đăng ký
router.delete('/:id', subscriptionPlanController.deleteSubscriptionPlan);

export default router;

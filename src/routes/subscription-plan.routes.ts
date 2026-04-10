import express from 'express';
import * as subscriptionPlanController from '../controllers/subscription-plan.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = express.Router();

// Áp dụng authentication cho tất cả routes
router.use(authenticateToken);

// ==================== ADMIN ROUTES ====================

// CREATE - Tạo mới gói đăng ký 
router.post('/admin/subscription-plans', subscriptionPlanController.createSubscriptionPlan);

// READ - Lấy tất cả gói đăng ký
router.get('/admin/subscription-plans', subscriptionPlanController.getAllSubscriptionPlans);

// READ - Lấy chi tiết gói đăng ký theo ID
router.get(
  '/admin/subscription-plans/:id',
  subscriptionPlanController.getSubscriptionPlanById,
);

// UPDATE - Cập nhật gói đăng ký
router.put(
  '/admin/subscription-plans/:id',
  subscriptionPlanController.updateSubscriptionPlan,
);

// UPDATE - Vô hiệu hóa gói đăng ký
router.patch(
  '/admin/subscription-plans/:id/deactivate',
  subscriptionPlanController.deactivateSubscriptionPlan,
);

// UPDATE - Kích hoạt lại gói đăng ký
router.patch(
  '/admin/subscription-plans/:id/activate',
  subscriptionPlanController.activateSubscriptionPlan,
);

// DELETE - Xóa gói đăng ký
router.delete(
  '/admin/subscription-plans/:id',
  subscriptionPlanController.deleteSubscriptionPlan,
);

// ==================== PUBLIC ROUTES ====================

// PUBLIC - Lấy danh sách gói đăng ký đang hoạt động (cho khách hàng)
router.get('/subscription-plans', async (req, res) => {
  try {
    const { isActive } = req.query;
    const filters: any = { isActive: true };
    
    const plans = await subscriptionPlanController.getAllSubscriptionPlans(req, res);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ.' });
  }
});

export default router;

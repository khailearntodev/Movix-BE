import express from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = express.Router();

// Tạo link thanh toán
router.post('/checkout', authenticateToken, PaymentController.createCheckoutSession);

// Lịch sử giao dịch của user hiện tại
router.get('/my-transactions', authenticateToken, PaymentController.getMyTransactions);

// Lấy thông tin thanh toán (của 1 order)
router.get('/info/:orderId', PaymentController.getPaymentInfo);

// Hủy 1 order đang pending
router.put('/cancel/:orderId', PaymentController.cancelPayment);

// Đăng ký webhook url với payOS
router.post('/confirm-webhook', PaymentController.confirmWebhook);

// Nhận webhook từ cổng thanh toán gọi đến
router.post('/webhook/:method', PaymentController.handleWebhook);

export default router;

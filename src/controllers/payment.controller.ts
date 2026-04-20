import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';

export class PaymentController {
  
  static async createCheckoutSession(req: Request, res: Response) {
    try {
      const { planId, paymentMethod } = req.body;
      const userId = req.userId!; 

      if (!planId) {
         return res.status(400).json({ success: false, message: 'Plan ID is required' });
      }

      if (!userId) {
         return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const checkoutData = await PaymentService.createCheckoutPayment(
        userId, 
        planId, 
        paymentMethod
      );

      return res.status(200).json({
        error: 0,
        message: 'Success',
        data: checkoutData
      });
    } catch (error: any) {
      console.error("PaymentController.createCheckoutSession error:", error);
      return res.status(500).json({ 
        error: -1, 
        message: error.message || 'Lỗi server khi tạo thanh toán',
        data: null
      });
    }
  }

  static async getPaymentInfo(req: Request, res: Response) {
    try {
      const paymentMethod = req.query.method as string || 'PAYOS';
      const orderId = req.params.orderId;
      
      const order = await PaymentService.getPaymentInfo(paymentMethod, orderId);
      if (!order) {
        return res.json({ error: -1, message: "failed", data: null });
      }
      return res.json({ error: 0, message: "ok", data: order });
    } catch (error) {
      console.log(error);
      return res.json({ error: -1, message: "failed", data: null });
    }
  }

  static async cancelPayment(req: Request, res: Response) {
    try {
      const paymentMethod = req.query.method as string || 'PAYOS';
      const { orderId } = req.params;
      const body = req.body;
      
      const order = await PaymentService.cancelPayment(paymentMethod, orderId, body.cancellationReason);
      if (!order) {
        return res.json({ error: -1, message: "failed", data: null });
      }
      return res.json({ error: 0, message: "ok", data: order });
    } catch (error) {
      console.error(error);
      return res.json({ error: -1, message: "failed", data: null });
    }
  }

  static async confirmWebhook(req: Request, res: Response) {
    try {
      const paymentMethod = req.query.method as string || 'PAYOS';
      const { webhookUrl } = req.body;
      
      await PaymentService.confirmWebhook(paymentMethod, webhookUrl);
      return res.json({ error: 0, message: "ok", data: null });
    } catch (error) {
      console.error(error);
      return res.json({ error: -1, message: "failed", data: null });
    }
  }

  static async handleWebhook(req: Request, res: Response) {
    try {
      const paymentMethod = req.params.method || 'PAYOS'; 
      const body = req.body;

      await PaymentService.handleWebhook(paymentMethod, body);

      return res.status(200).json({ success: true, message: 'Webhook received and processed' });
    } catch (error: any) {
      console.error("PaymentController.handleWebhook Error:", error);
      return res.status(200).json({ success: false, message: error.message });
    }
  }

}

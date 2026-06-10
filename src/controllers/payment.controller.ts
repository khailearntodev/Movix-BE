import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { TransactionStatus } from '@prisma/client';

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
        paymentMethod,
        req.ip
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

  static async getMyTransactions(req: Request, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: -1, message: 'Unauthorized', data: null });
      }

      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 10);
      const statusQuery = req.query.status as string | undefined;

      let status: TransactionStatus | undefined;
      if (statusQuery) {
        const allowedStatus = Object.values(TransactionStatus);
        if (!allowedStatus.includes(statusQuery as TransactionStatus)) {
          return res.status(400).json({
            error: -1,
            message: `Invalid status. Allowed values: ${allowedStatus.join(', ')}`,
            data: null,
          });
        }
        status = statusQuery as TransactionStatus;
      }

      const result = await PaymentService.getMyTransactions(userId, page, limit, status);
      return res.status(200).json({
        error: 0,
        message: 'ok',
        data: result.items,
        meta: result.meta,
      });
    } catch (error: any) {
      console.error('PaymentController.getMyTransactions error:', error);
      return res.status(500).json({
        error: -1,
        message: error.message || 'failed',
        data: null,
      });
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

  static async handleVnpayIpn(req: Request, res: Response) {
    try {
      await PaymentService.handleWebhook('VNPAY', req.query);
      return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
    } catch (error: any) {
      console.error("PaymentController.handleVnpayIpn Error:", error);
      const message = error.message || '';

      if (message.includes('checksum')) {
        return res.status(200).json({ RspCode: '97', Message: 'Invalid Checksum' });
      }

      if (message.includes('not found')) {
        return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
      }

      if (message.includes('already processed')) {
        return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
      }

      if (message.includes('amount')) {
        return res.status(200).json({ RspCode: '04', Message: 'Invalid amount' });
      }

      return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
    }
  }

  static async handleVnpayReturn(req: Request, res: Response) {
    const FE_URL = process.env.FE_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    const orderCode = req.query.vnp_TxnRef ? String(req.query.vnp_TxnRef) : '';
    const isSuccess = req.query.vnp_ResponseCode === '00' && req.query.vnp_TransactionStatus === '00';

    try {
      await PaymentService.handleWebhook('VNPAY', req.query);
    } catch (error: any) {
      if (!String(error.message || '').includes('already processed')) {
        console.error("PaymentController.handleVnpayReturn Error:", error);
      }
    }

    const statusPath = isSuccess ? 'success' : 'cancel';
    return res.redirect(`${FE_URL}/payment/${statusPath}?method=VNPAY&orderCode=${encodeURIComponent(orderCode)}`);
  }

}

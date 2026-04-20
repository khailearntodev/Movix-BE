import { IPaymentProvider, WebhookResult, PaymentCreateResult } from './payment-provider.interface';
import { payos } from '../../lib/payos';

export class PayosProvider implements IPaymentProvider {
  async createPaymentUrl(userId: string, planId: string, amount: number, planName: string, orderCode: number): Promise<PaymentCreateResult> {
    const FE_URL = process.env.FE_URL || 'http://localhost:3000';
    
    const paymentLink = await payos.paymentRequests.create({
      orderCode: orderCode,
      amount: amount,
      description: `Thanh toan ${planName}`.substring(0, 25),
      returnUrl: `${FE_URL}/payment/success`,
      cancelUrl: `${FE_URL}/payment/cancel`,
    });
    
    return {
      bin: paymentLink.bin,
      checkoutUrl: paymentLink.checkoutUrl,
      accountNumber: paymentLink.accountNumber,
      accountName: paymentLink.accountName,
      amount: paymentLink.amount,
      description: paymentLink.description,
      orderCode: paymentLink.orderCode,
      qrCode: paymentLink.qrCode,
    };
  }

  async verifyWebhook(webhookBody: any): Promise<WebhookResult> {
    const data = await payos.webhooks.verify(webhookBody);
    
    const isSuccess = data.code === '00';

    return {
      orderCode: String(data.orderCode),
      isSuccess: isSuccess,
      amount: data.amount,
    };
  }

  async getPaymentInfo(orderId: string): Promise<any> {
    return await payos.paymentRequests.get(Number(orderId));
  }

  async cancelPayment(orderId: string, reason?: string): Promise<any> {
    return await payos.paymentRequests.cancel(Number(orderId), reason);
  }

  async confirmWebhook(webhookUrl: string): Promise<any> {
    return await payos.webhooks.confirm(webhookUrl);
  }
}



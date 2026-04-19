export interface WebhookResult {
  orderCode: string;
  isSuccess: boolean;
  amount?: number;
}

export interface PaymentCreateResult {
  checkoutUrl: string;
  qrCode?: string;
  accountNumber?: string;
  accountName?: string;
  bin?: string;
  orderCode?: number | string;
  amount?: number;
  description?: string;
}

export interface IPaymentProvider {
  createPaymentUrl(
    userId: string,
    planId: string,
    amount: number,
    planName: string,
    orderCode: number,
  ): Promise<PaymentCreateResult>;
  
  verifyWebhook(webhookBody: any): Promise<WebhookResult> | WebhookResult;
  getPaymentInfo?(orderId: string): Promise<any>;
  cancelPayment?(orderId: string, reason?: string): Promise<any>;
  confirmWebhook?(webhookUrl: string): Promise<any>;
}

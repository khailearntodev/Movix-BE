import { HashAlgorithm, ProductCode, VNPay, ignoreLogger } from 'vnpay';
import { IPaymentProvider, PaymentCreateResult, WebhookResult } from './payment-provider.interface';

const DEFAULT_VNPAY_PAYMENT_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for VNPAY payments`);
  }
  return value;
}

function getBaseUrl(): string {
  return process.env.BE_URL || `http://localhost:${process.env.PORT || 5000}`;
}

function getReturnUrl(): string {
  return process.env.VNPAY_RETURN_URL || `${getBaseUrl()}/api/payment/return/vnpay`;
}

function getPaymentEndpointConfig() {
  const paymentUrl = process.env.VNPAY_PAYMENT_URL || DEFAULT_VNPAY_PAYMENT_URL;
  const url = new URL(paymentUrl);

  return {
    vnpayHost: `${url.protocol}//${url.host}`,
    paymentEndpoint: url.pathname.replace(/^\//, ''),
  };
}

function normalizeIp(clientIp?: string): string {
  if (!clientIp || clientIp === '::1') {
    return '127.0.0.1';
  }

  return clientIp.replace(/^::ffff:/, '');
}

function toPlainText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim();
}

function createVnpayClient() {
  const { vnpayHost, paymentEndpoint } = getPaymentEndpointConfig();
  const testMode = (process.env.VNPAY_TEST_MODE || 'true').toLowerCase() !== 'false';

  return new VNPay({
    tmnCode: getRequiredEnv('VNPAY_TMN_CODE'),
    secureSecret: getRequiredEnv('VNPAY_HASH_SECRET'),
    vnpayHost,
    testMode,
    hashAlgorithm: HashAlgorithm.SHA512,
    enableLog: false,
    loggerFn: ignoreLogger,
    vnp_OrderType: ProductCode.Entertainment_Training,
    endpoints: {
      paymentEndpoint,
    },
  });
}

export class VnpayProvider implements IPaymentProvider {
  async createPaymentUrl(
    userId: string,
    planId: string,
    amount: number,
    planName: string,
    orderCode: number,
    clientIp?: string,
  ): Promise<PaymentCreateResult> {
    const checkoutUrl = createVnpayClient().buildPaymentUrl({
      vnp_Amount: Math.round(amount),
      vnp_IpAddr: normalizeIp(clientIp),
      vnp_ReturnUrl: getReturnUrl(),
      vnp_TxnRef: String(orderCode),
      vnp_OrderInfo: `Thanh toan Movix ${toPlainText(planName)}`.substring(0, 255),
      vnp_OrderType: ProductCode.Entertainment_Training,
    });

    return {
      checkoutUrl,
      orderCode,
      amount,
      description: `Thanh toan Movix ${planName}`,
    };
  }

  verifyWebhook(webhookBody: any): WebhookResult {
    const verified = createVnpayClient().verifyIpnCall(webhookBody);

    if (!verified.isVerified) {
      throw new Error('VNPAY checksum verification failed');
    }

    return {
      orderCode: String(verified.vnp_TxnRef),
      isSuccess: verified.isSuccess,
      amount: Number(verified.vnp_Amount),
      metadata: {
        message: verified.message,
        responseCode: verified.vnp_ResponseCode,
        transactionStatus: verified.vnp_TransactionStatus,
        transactionNo: verified.vnp_TransactionNo,
        bankCode: verified.vnp_BankCode,
        bankTranNo: verified.vnp_BankTranNo,
        cardType: verified.vnp_CardType,
        payDate: verified.vnp_PayDate,
        orderInfo: verified.vnp_OrderInfo,
      },
    };
  }
}

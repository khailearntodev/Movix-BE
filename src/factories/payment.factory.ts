import { IPaymentProvider } from '../providers/payment/payment-provider.interface';
import { PayosProvider } from '../providers/payment/payos.provider';

export class PaymentFactory {
  static getProvider(paymentMethod: string): IPaymentProvider {
    switch (paymentMethod.toUpperCase()) {
      case 'PAYOS':
        return new PayosProvider();
      // case 'VNPAY':
      //   return new VnpayProvider();
      // case 'MOMO':
      //   return new MomoProvider();
      default:
        throw new Error(`Payment method ${paymentMethod} is not supported!`);
    }
  }
}

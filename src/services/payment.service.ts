import { Prisma, TransactionStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { PaymentFactory } from "../factories/payment.factory";

export class PaymentService {
  static async createCheckoutPayment(userId: string, planId: string, paymentMethod: string = 'PAYOS') {
    // 1. Lấy thông tin plan
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });
    
    if (!plan) {
      throw new Error("Subscription plan not found");
    }

    // 2. Tạo mã order 
    const orderCode = Number(String(Date.now()).slice(-6) + Math.floor(Math.random() * 1000));
    
    // 3. Lưu Transaction vào DB với trạng thái PENDING
    const transaction = await prisma.transaction.create({
      data: {
        user_id: userId,
        plan_id: planId,
        amount: plan.price,
        payment_method: paymentMethod.toUpperCase(),
        transaction_ref: String(orderCode), 
        status: 'PENDING',
      },
    });

    // 4. Lấy Provider qua Factory
    const paymentProvider = PaymentFactory.getProvider(paymentMethod);
    
    // 5. Thực thi việc tạo đối tượng thanh toán trên cổng đó
    const paymentLinkData = await paymentProvider.createPaymentUrl(
      userId, 
      planId, 
      plan.price, 
      plan.name, 
      orderCode
    );

    return {
      paymentData: paymentLinkData,
      transactionId: transaction.id
    };
  }

  
  static async getPaymentInfo(paymentMethod: string, orderId: string) {
    const paymentProvider = PaymentFactory.getProvider(paymentMethod);
    if (!paymentProvider.getPaymentInfo) {
      throw new Error(`Cổng thanh toán ${paymentMethod} không hỗ trợ lấy thông tin`);
    }
    return await paymentProvider.getPaymentInfo(orderId);
  }

  static async cancelPayment(paymentMethod: string, orderId: string, reason?: string) {
    const paymentProvider = PaymentFactory.getProvider(paymentMethod);
    if (!paymentProvider.cancelPayment) {
      throw new Error(`Cổng thanh toán ${paymentMethod} không hỗ trợ hủy giao dịch`);
    }
    return await paymentProvider.cancelPayment(orderId, reason);
  }

  static async confirmWebhook(paymentMethod: string, webhookUrl: string) {
    const paymentProvider = PaymentFactory.getProvider(paymentMethod);
    if (!paymentProvider.confirmWebhook) {
      throw new Error(`Cổng thanh toán ${paymentMethod} không hỗ trợ confirm webhook`);
    }
    return await paymentProvider.confirmWebhook(webhookUrl);
  }

  static async getMyTransactions(
    userId: string,
    page: number = 1,
    limit: number = 10,
    status?: TransactionStatus,
  ) {
    const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
    const safeLimit = Number.isNaN(limit) || limit < 1 ? 10 : Math.min(limit, 100);
    const skip = (safePage - 1) * safeLimit;

    const where: Prisma.TransactionWhereInput = {
      user_id: userId,
      ...(status ? { status } : {}),
    };

    const [transactions, totalItems] = await prisma.$transaction([
      prisma.transaction.findMany({
        where,
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              duration_days: true,
              currency: true,
              level: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: safeLimit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      items: transactions,
      meta: {
        totalItems,
        currentPage: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(totalItems / safeLimit),
      },
    };
  }

  // Hàm xử lý webhook chung từ các Payment Provider
  static async handleWebhook(paymentMethod: string, webhookBody: any) {
    const paymentProvider = PaymentFactory.getProvider(paymentMethod);
    const result = await paymentProvider.verifyWebhook(webhookBody);
    const transaction = await prisma.transaction.findFirst({
      where: { 
        transaction_ref: result.orderCode,
        status: 'PENDING'
      }
    });

    if (!transaction) {
      throw new Error("Transaction not found or already processed");
    }

    if (!result.isSuccess) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'FAILED' }
      });
      return { success: false, message: 'Payment failed' };
    }

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'COMPLETED' }
    });

  
    if (!transaction.plan_id) {
       return { success: true, message: 'Webhook processed successfully, no plan attached' };
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: transaction.plan_id }
    });

    if (plan) {
      const now = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(now.getDate() + plan.duration_days); 
      
      await prisma.userSubscription.upsert({
        where: { user_id: transaction.user_id },
        update: {
          plan_id: plan.id,
          status: 'ACTIVE',
          start_date: now,
          end_date: expiresAt,
        },
        create: {
          user_id: transaction.user_id,
          plan_id: plan.id,
          status: 'ACTIVE',
          start_date: now,
          end_date: expiresAt,
        }
      });
    }

    return { success: true, message: 'Webhook processed successfully' };
  }
}
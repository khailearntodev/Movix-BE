import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { payos } from "../lib/payos";


export class PaymentService {
   static async createCheckoutPaymant(userId: string, planId :string) {
    const plan =await prisma.subscriptionPlan.findUnique({
        where: { id: planId },
    });
    if (!plan) {
        throw new Error("Subscription plan not found");
    }
    const orderCode = Number(String(Date.now()).slice(-6) + Math.floor(Math.random() * 1000));
    const transaction = await prisma.transaction.create({
      data: {
        user_id: userId,
        plan_id: planId,
        amount: plan.price,
        payment_method: 'PAYOS',
        transaction_ref: String(orderCode), 
        status: 'PENDING',
      },
    });
    const FE_URL = process.env.FE_URL || 'http://localhost:3000';
    const paymentLink = await payos.paymentRequests.create({
      orderCode: orderCode,
      amount: plan.price,
      description: `Thanh toan ${plan.name}`.substring(0, 25),
      returnUrl: `${FE_URL}/payment/success`,
      cancelUrl: `${FE_URL}/payment/cancel`,
    });
    return {
      checkoutUrl: paymentLink.checkoutUrl,
      transactionId: transaction.id
    };
}
}
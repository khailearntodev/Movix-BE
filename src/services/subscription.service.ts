import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

const MAX_REFUND_REQUESTS_PER_USER = 1;

export const createUserSubscription = async (
  data: Prisma.UserSubscriptionCreateInput,
) => {
  const userSubscription = await prisma.userSubscription.create({
    data,
    include: {
      plan: true,
      user: {
        select: {
          id: true,
          email: true,
          username: true,
        },
      },
    },
  });

  return userSubscription;
};


export const getUserSubscription = async (userId: string) => {
  const subscription = await prisma.userSubscription.findUnique({
    where: { user_id: userId },
    include: {
      plan: true,
    },
  });

  return subscription;
};

export const updateUserSubscription = async (
  userId: string,
  data: Prisma.UserSubscriptionUpdateInput,
) => {
  const subscription = await prisma.userSubscription.update({
    where: { user_id: userId },
    data,
    include: {
      plan: true,
    },
  });

  return subscription;
};

export const cancelUserSubscription = async (userId: string) => {
  const subscription = await prisma.userSubscription.update({
    where: { user_id: userId },
    data: {
      status: 'CANCELLED',
    },
    include: {
      plan: true,
    },
  });

  return subscription;
};

export const requestRefundAndCancelSubscription = async (
  userId: string,
  reason?: string,
) => {
  const subscription = await prisma.userSubscription.findUnique({
    where: { user_id: userId },
    include: { plan: true },
  });

  if (!subscription || subscription.status !== 'ACTIVE') {
    throw new Error('Bạn chưa có đăng ký gói nào.');
  }

  const now = new Date();
  const diffDays = (now.getTime() - subscription.start_date.getTime()) / (1000 * 3600 * 24);
  if (diffDays > 1) {
    throw new Error('Chỉ được hoàn tiền trong vòng 1 ngày kể từ khi đăng ký gói.');
  }

  const downloads = await prisma.offlineDownload.count({
    where: {
      user_id: userId,
      downloaded_at: { gte: subscription.start_date },
    },
  });

  let watchParties = 0;
  if (subscription.plan.can_create_watch_party) {
    watchParties = await prisma.watchParty.count({
      where: {
        host_user_id: userId,
        created_at: { gte: subscription.start_date },
      },
    });
  }

  if (downloads > 0 || watchParties > 0) {
    throw new Error('Không thể hoàn tiền vì bạn đã sử dụng các tính năng của gói đăng ký (tải offline hoặc tạo watch party).');
  }
  const totalRefundRequests = await prisma.refundRequest.count({
    where: { user_id: userId },
  });

  if (totalRefundRequests >= MAX_REFUND_REQUESTS_PER_USER) {
    throw new Error(
      `Mỗi tài khoản chỉ được gửi tối đa ${MAX_REFUND_REQUESTS_PER_USER} yêu cầu hoàn tiền.`,
    );
  }

  const lastRequest = await prisma.refundRequest.findFirst({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
  });

  if (
    lastRequest &&
    lastRequest.created_at.getTime() > now.getTime() - 30 * 24 * 3600 * 1000
  ) {
    throw new Error(
      'Mỗi người dùng chỉ được yêu cầu hoàn tiền một lần trong vòng 30 ngày. Vui lòng thử lại sau.',
    );
  }

  const transaction = await prisma.transaction.findFirst({
    where: {
      user_id: userId,
      plan_id: subscription.plan_id,
      status: 'COMPLETED',
      created_at: { gte: subscription.start_date },
    },
    orderBy: { created_at: 'desc' },
  });

  if (!transaction) {
    throw new Error('No completed transaction found to refund');
  }

  const existingRequest = await prisma.refundRequest.findFirst({
    where: { transaction_id: transaction.id },
  });

  if (existingRequest) {
    throw new Error('A refund request is already pending for this subscription');
  }

  const refundRequest = await prisma.refundRequest.create({
    data: {
      user_id: userId,
      transaction_id: transaction.id,
      status: 'PENDING',
      reason: reason?.trim() || 'No reason provided',
    },
  });

  return {
    message: 'Đã gửi yêu cầu hoàn tiền. Vui lòng đợi xác nhận từ Admin.',
    refundRequest,
  };
};


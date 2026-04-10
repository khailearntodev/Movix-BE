import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

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

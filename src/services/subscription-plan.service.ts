import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';


export const createSubscriptionPlan = async (
    data: Prisma.SubscriptionPlanCreateInput,
) => {
    const existingPlan = await prisma.subscriptionPlan.findUnique({
        where: { name: data.name },
    });

    if (existingPlan) {
        throw new Error('PLAN_NAME_ALREADY_EXISTS');
    }
    const newPlan = await prisma.subscriptionPlan.create({
        data,
    });

    return newPlan;
};


export const getAllSubscriptionPlans = async (
  filters?: {
    isActive?: boolean;
  },
) => {
  const where: Prisma.SubscriptionPlanWhereInput = {};

  if (filters?.isActive !== undefined) {
    where.is_active = filters.isActive;
  }

  const plans = await prisma.subscriptionPlan.findMany({
    where,
    include: {
      subscriptions: {
        select: {
          id: true,
          user_id: true,
          status: true,
        },
      },
      transactions: {
        select: {
          id: true,
          amount: true,
          status: true,
        },
      },
    },
    orderBy: {
      level: 'asc',
    },
  });

  return plans;
};

export const getSubscriptionPlanById = async (id: string) => {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id },
    include: {
      subscriptions: {
        select: {
          id: true,
          user_id: true,
          status: true,
          start_date: true,
          end_date: true,
        },
      },
      transactions: {
        select: {
          id: true,
          amount: true,
          status: true,
          created_at: true,
        },
      },
    },
  });

  if (!plan) {
    throw new Error('PLAN_NOT_FOUND');
  }

  return plan;
};

export const updateSubscriptionPlan = async (
  id: string,
  data: Prisma.SubscriptionPlanUpdateInput,
) => {
  const existingPlan = await prisma.subscriptionPlan.findUnique({
    where: { id },
  });

  if (!existingPlan) {
    throw new Error('PLAN_NOT_FOUND');
  }
  if (data.name && data.name !== existingPlan.name) {
    const duplicatePlan = await prisma.subscriptionPlan.findUnique({
      where: { name: data.name as string },
    });

    if (duplicatePlan) {
      throw new Error('PLAN_NAME_ALREADY_EXISTS');
    }
  }

  const updatedPlan = await prisma.subscriptionPlan.update({
    where: { id },
    data,
    include: {
      subscriptions: {
        select: {
          id: true,
          user_id: true,
          status: true,
        },
      },
    },
  });

  return updatedPlan;
};

export const deleteSubscriptionPlan = async (id: string) => {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id },
    include: {
      subscriptions: {
        where: {
          status: 'ACTIVE',
        },
      },
    },
  });

  if (!plan) {
    throw new Error('PLAN_NOT_FOUND');
  }

  if (plan.subscriptions.length > 0) {
    throw new Error('CANNOT_DELETE_PLAN_IN_USE');
  }

  const deletedPlan = await prisma.subscriptionPlan.delete({
    where: { id },
  });

  return deletedPlan;
};

export const deactivateSubscriptionPlan = async (id: string) => {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id },
  });

  if (!plan) {
    throw new Error('PLAN_NOT_FOUND');
  }

  const deactivatedPlan = await prisma.subscriptionPlan.update({
    where: { id },
    data: {
      is_active: false,
    },
  });

  return deactivatedPlan;
};

export const activateSubscriptionPlan = async (id: string) => {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id },
  });

  if (!plan) {
    throw new Error('PLAN_NOT_FOUND');
  }

  const activatedPlan = await prisma.subscriptionPlan.update({
    where: { id },
    data: {
      is_active: true,
    },
  });

  return activatedPlan;
};

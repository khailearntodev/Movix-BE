import { SubscriptionStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

export const SubscriptionService = {
  getAllSubscriptionPlans: async () => {
    return prisma.subscriptionPlan.findMany({
      orderBy: { price: 'asc' }
    });
  },

  getAllSubscriptions: async (
    page: number,
    take: number,
    statusFilter?: SubscriptionStatus,
  ) => {
    const skip = (page - 1) * take;
    const whereCondition = statusFilter ? { status: statusFilter } : {};

    const [subscriptions, total] = await prisma.$transaction([
      prisma.userSubscription.findMany({
        where: whereCondition,
        skip,
        take,
        orderBy: { start_date: "desc" },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              display_name: true,
              avatar_url: true,
              email: true,
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              duration_days: true,
            },
          },
        },
      }),
      prisma.userSubscription.count({ where: whereCondition }),
    ]);
    return {
      data: subscriptions,
      meta: {
        totalItems: total,
        currentPage: page,
        itemsPerPage: take,
        totalPages: Math.ceil(total / take),
      },
    };
  },

  updateSubscriptionStatus: async (
    subscriptionId: string,
    newStatus: SubscriptionStatus,
  ) => {
    const currentSub = await prisma.userSubscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!currentSub) throw new Error("Không tìm thấy dữ liệu đăng ký");

    const updateData: any = { status: newStatus };
    const now = new Date();

    if (newStatus === SubscriptionStatus.CANCELLED) {
      updateData.end_date = now;
    } else if (
      newStatus === SubscriptionStatus.ACTIVE ||
      newStatus === SubscriptionStatus.TRIAL
    ) {
      // Kích hoạt lại: Set ngày bắt đầu là hôm nay, ngày kết thúc = hôm nay + số ngày của Plan
      updateData.start_date = now;

      const newEndDate = new Date(now);
      newEndDate.setDate(now.getDate() + currentSub.plan.duration_days);
      updateData.end_date = newEndDate;
    }

    return prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: updateData,
    });
  },

  deleteSubscription: async (subscriptionId: string) => {
    return await prisma.userSubscription.delete({
      where: { id: subscriptionId },
    });
  },

  toggleSubscriptionFlag: async (planId: string) => {
    const subscription = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      select: { is_active: true },
    });

    if (!subscription) throw new Error("Subscription not found");

    return prisma.subscriptionPlan.update({
      where: { id: planId },
      data: { is_active: !subscription.is_active },
    });
  },

  getSubscriptionDetails: async (subscriptionId: string) => {
    const subscription = await prisma.userSubscription.findUnique({
      where: { id: subscriptionId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
            email: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            duration_days: true,
          },
        },
      },
    });

    if (!subscription) throw new Error("Subscription not found");

    return subscription;
  },

  createPlan: async (data: {
    name: string;
    description?: string;
    price: number;
    duration_days: number;
    level?: number;
    benefits?: any;
    can_create_watch_party?: boolean;
    max_watch_party_participants?: number;
    can_kick_mute_members?: boolean;
  }) => {
    // Validate 1: Kiểm tra tên gói cước đã tồn tại chưa
    const existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { name: data.name },
    });

    if (existingPlan) {
      throw new Error("Tên gói cước này đã tồn tại trong hệ thống!");
    }

    // Validate 2: Giá và số ngày không được âm
    if (data.price < 0 || data.duration_days <= 0) {
      throw new Error("Giá tiền và số ngày sử dụng không hợp lệ!");
    }

    return prisma.subscriptionPlan.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        duration_days: data.duration_days,
        level: data.level || 1,
        benefits: data.benefits,
        can_create_watch_party: data.can_create_watch_party || false,
        max_watch_party_participants: data.max_watch_party_participants || 0,
        can_kick_mute_members: data.can_kick_mute_members || false,
        is_active: true,
      },
    });
  },

  grantSubscription: async (userId: string, planId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("Người dùng không tồn tại!");

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });
    if (!plan || !plan.is_active) {
      throw new Error("Gói cước không tồn tại hoặc đã bị khóa!");
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + plan.duration_days); 

    return prisma.userSubscription.upsert({
      where: {
        user_id: userId, 
      },
      update: {
        plan_id: planId,
        start_date: startDate,
        end_date: endDate,
        status: SubscriptionStatus.ACTIVE,
      },
      create: {
        user_id: userId,
        plan_id: planId,
        start_date: startDate,
        end_date: endDate,
        status: SubscriptionStatus.ACTIVE,
      },
    });
  },

  revokeSubscription: async (userId: string) => {
    const subscription = await prisma.userSubscription.findFirst({
      where: {
        user_id: userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (!subscription) {
      throw new Error("Người dùng này không có đăng ký nào đang hoạt động!");
    }

    return prisma.userSubscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.CANCELLED, end_date: new Date() },
    });
  },

  updateSubscriptionPlan: async (planId: string, data: any) => {
    const existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!existingPlan) {
      throw new Error("Gói cước không tồn tại!");
    }

    return prisma.subscriptionPlan.update({
      where: { id: planId },
      data: {
        name: data.name || existingPlan.name,
        description: data.description || existingPlan.description,
        price: data.price !== undefined ? data.price : existingPlan.price,
        duration_days: data.duration_days !== undefined ? data.duration_days : existingPlan.duration_days,
        level: data.level !== undefined ? data.level : existingPlan.level,
        benefits: data.benefits || existingPlan.benefits,
        can_create_watch_party: data.can_create_watch_party !== undefined ? data.can_create_watch_party : existingPlan.can_create_watch_party,
        max_watch_party_participants: data.max_watch_party_participants !== undefined ? data.max_watch_party_participants : existingPlan.max_watch_party_participants,
        can_kick_mute_members: data.can_kick_mute_members !== undefined ? data.can_kick_mute_members : existingPlan.can_kick_mute_members,
      },
    });
  }
};
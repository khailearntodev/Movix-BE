import { prisma } from '../lib/prisma';
import { ReportStatus, ReportTargetType, TransactionStatus, RefundStatus, PostStatus } from '@prisma/client';

export const getAllReports = async (
  page: number,
  take: number,
  search: string,
  status: string,
  targetType: string
) => {
  const where: any = {};

  if (status && status !== 'ALL') {
    where.status = status as ReportStatus;
  }

  if (targetType && targetType !== 'ALL') {
    where.target_type = targetType as ReportTargetType;
  }

  if (search) {
    where.reason = {
      contains: search,
      mode: 'insensitive',
    };
  }

  const reports = await prisma.report.findMany({
    where,
    skip: (page - 1) * take,
    take: take,
    orderBy: [
      { priority_level: 'desc' },
      { created_at: 'desc' }
    ],
    include: {
      reporter: {
        select: {
          id: true,
          display_name: true,
          email: true,
          avatar_url: true,
        },
      },
      resolver: {
        select: {
          id: true,
          display_name: true,
        },
      },
    },
  });

  const reportsWithTargetData = await Promise.all(
    reports.map(async (report) => {
      let targetData = null;
      try {
        if (report.target_type === 'COMMENT') {
          targetData = await prisma.comment.findUnique({
            where: { id: report.target_id },
            select: { comment: true, movie: { select: { title: true, slug: true } } },
          });
        } else if (report.target_type === 'USER') {
          targetData = await prisma.user.findUnique({
            where: { id: report.target_id },
            select: { display_name: true, email: true, avatar_url: true },
          });
        } else if (report.target_type === 'BLOG') {
          targetData = await prisma.blogPost.findUnique({
            where: { id: report.target_id },
            select: {
              title: true,
              id: true,
              slug: true,
              status: true,
              content: true,
              user: {
                select: {
                  id: true,
                  display_name: true,
                  email: true,
                  avatar_url: true,
                }
              }
            },
          });
        }
      } catch (error) {
        console.error(`Error fetching targetData for report ${report.id}`, error);
      }

      return {
        ...report,
        targetData,
      };
    })
  );

  const total = await prisma.report.count({ where });

  return {
    reports: reportsWithTargetData,
    total,
    totalPages: Math.ceil(total / take),
  };
};

export const updateReportStatus = async (
  id: string,
  resolverId: string,
  status: ReportStatus,
  resolutionNote?: string
) => {
  return await prisma.report.update({
    where: { id },
    data: {
      status,
      resolved_at: status !== 'PENDING' ? new Date() : null,
      resolved_by: status !== 'PENDING' ? resolverId : null,
      resolution_note: resolutionNote,
    },
  });
};

export const moderateAndHideBlogPost = async (reportId: string, blogId: string, resolverId: string, resolutionNote?: string) => {
  return await prisma.$transaction(async (tx) => {
    const updatedBlogPost = await tx.blogPost.update({
      where: { id: blogId },
      data: { status: PostStatus.HIDDEN },
    });

    const updatedReport = await tx.report.update({
      where: { id: reportId },
      data: {
        status: ReportStatus.RESOLVED,
        resolved_at: new Date(),
        resolved_by: resolverId,
        resolution_note: resolutionNote || 'Nội dung vi phạm tiêu chuẩn cộng đồng!!!',
      },
    });

    return { updatedBlogPost, updatedReport };
  });
};

export const getFinancialReport = async (startDay: Date, endDate: Date) => {
  const [revenueStats, refundStats, transactionByPlanRaw, plans] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        status: TransactionStatus.COMPLETED,
        created_at: { gte: startDay, lte: endDate }
      },
      _sum: { amount: true },
      _count: { id: true }
    }),
    prisma.transaction.aggregate({
      where: {
        status: TransactionStatus.REFUNDED,
        created_at: { gte: startDay, lte: endDate }
      },
      _sum: { amount: true }
    }),
    prisma.transaction.groupBy({
      by: ['plan_id'],
      where: {
        status: TransactionStatus.COMPLETED,
        created_at: { gte: startDay, lte: endDate }
      },
      _sum: { amount: true },
      _count: { id: true }
    }),
    prisma.subscriptionPlan.findMany({
      select: { id: true, name: true }
    })
  ]);

  const planMap = new Map(plans.map(p => [p.id, p.name]));
  const transactionByPlan = transactionByPlanRaw.map(item => ({
    ...item,
    plan_name: item.plan_id ? (planMap.get(item.plan_id) || 'Gói ẩn') : 'Hệ thống'
  }));

  const totalRevenue = revenueStats._sum.amount || 0;
  const totalRefund = refundStats._sum.amount || 0;

  return {
    period: { start: startDay, end: endDate },
    summary: {
      totalRevenue,
      totalRefund,
      netRevenue: totalRevenue - totalRefund,
      totalTransactions: revenueStats._count.id,
    },
    planBreakdown: { transactionByPlan }
  };
} 
import { prisma } from '../lib/prisma';
import { ReportStatus, ReportTargetType } from '@prisma/client';

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
    orderBy: { created_at: 'desc' },
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

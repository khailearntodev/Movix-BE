import { prisma } from '../lib/prisma';

export const getActiveBanners = async () => {
  return prisma.banner.findMany({
    where: { 
      is_active: true, 
      is_deleted: false 
    },
    orderBy: { 
      created_at: 'desc' 
    },
  });
};
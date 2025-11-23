import { prisma } from '../lib/prisma';
import { UserStatus } from '@prisma/client';

export const getAllUsers = async (
  page: number, 
  take: number, 
  search: string, 
  sortBy: string, 
  flaggedOnly: boolean
) => {
  const skip = (page - 1) * take;
  
  const where: any = {
    is_deleted: false,
  };

  if (search) {
    where.OR = [
      { username: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { display_name: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (flaggedOnly) {
    where.is_flagged = true;
  }

  let orderBy: any = { last_login_at: 'desc' };
  if (sortBy === 'nameAsc') orderBy = { display_name: 'asc' };
  if (sortBy === 'nameDesc') orderBy = { display_name: 'desc' };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy,
      include: { role: true }, 
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users,
    pagination: {
      page,
      take,
      total,
      totalPages: Math.ceil(total / take),
    }
  };
};

export const getUserDetails = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: true,
      watch_history: {
        take: 20, 
        orderBy: { watched_at: 'desc' },
        include: { episode: { include: { season: { include: { movie: true } } } } }
      },
      playlists: {
         orderBy: { created_at: 'desc' },
         include: { _count: { select: { playlist_movies: true } } } 
      },
      favourites: {
        orderBy: { created_at: 'desc' },
        include: { movie: true }
      }
    }
  });
  return user;
};

export const updateUserStatus = async (userId: string, status: UserStatus) => {
  return prisma.user.update({
    where: { id: userId },
    data: { status }
  });
};

export const toggleUserFlag = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { is_flagged: true } 
  });
  
  if (!user) throw new Error("User not found");

  return prisma.user.update({
    where: { id: userId },
    data: { is_flagged: !user.is_flagged }
  });
};
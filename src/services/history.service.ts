import { prisma } from '../lib/prisma';

export const upsertWatchHistory = async (
  userId: string,
  episodeId: string,
  progressSeconds: number,
  isFinished: boolean = false
) => {
  return prisma.watchHistory.upsert({
    where: {
      user_id_episode_id: {
        user_id: userId,
        episode_id: episodeId,
      },
    },
    update: {
      progress_seconds: progressSeconds,
      is_finished: isFinished,
      watched_at: new Date(), 
    },
    create: {
      user_id: userId,
      episode_id: episodeId,
      progress_seconds: progressSeconds,
      is_finished: isFinished,
    },
  });
};

export const getWatchHistory = async (userId: string, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  
  const [total, history] = await prisma.$transaction(async (tx) => {
    const total = await tx.watchHistory.count({ where: { user_id: userId, is_deleted: false } });
    const history = await tx.watchHistory.findMany({
      where: { user_id: userId, is_deleted: false },
      orderBy: { watched_at: 'desc' },
      skip,
      take: limit,
      include: {
        episode: {
          include: {
            season: {
              include: {
                movie: {
                  select: {
                    id: true,
                    title: true,
                    poster_url: true,
                    slug: true,
                  }
                }
              }
            }
          }
        }
      }
    });
    return [total, history];
  }, { timeout: 20000 });

  return {
    data: history,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};
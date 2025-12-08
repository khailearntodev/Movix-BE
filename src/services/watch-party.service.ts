import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const watchPartyService = {
  create: async (userId: string, data: { 
    title: string; 
    movieId: string; 
    episodeId?: string;
    isPrivate: boolean; 
    scheduledAt?: string 
  }) => {
    
    const existingParty = await prisma.watchParty.findFirst({
      where: {
        host_user_id: userId,
        is_active: true, 
      }
    });

    if (existingParty) {
      throw new Error("USER_HAS_ACTIVE_PARTY");
    }

    const joinCode = data.isPrivate 
      ? Math.random().toString(36).substring(2, 8).toUpperCase() 
      : null;

    const startedAt = data.scheduledAt ? null : new Date();

    return prisma.watchParty.create({
      data: {
        host_user_id: userId,
        title: data.title,
        movie_id: data.movieId,
        episode_id: data.episodeId || null, 
        is_private: data.isPrivate,
        join_code: joinCode,
        scheduled_at: data.scheduledAt ? new Date(data.scheduledAt) : null,
        started_at: startedAt,
        is_active: true,
        members: {
          create: {
            user_id: userId,
            role: 'host',
            is_online: true
          }
        },
        reminders: data.scheduledAt ? {
            create: {
                user_id: userId
            }
        } : undefined
      }
    });
  },

  getAll: async (filter: 'live' | 'scheduled' | 'ended' = 'live', search?: string) => {
    const where: Prisma.WatchPartyWhereInput = {};
    if (filter === 'live') {
      where.is_active = true;
      where.started_at = { not: null }; // Đã bắt đầu
    } else if (filter === 'scheduled') {
      where.is_active = true;
      where.started_at = null; // Chưa bắt đầu
      where.scheduled_at = { not: null }; // Có lịch
    } else if (filter === 'ended') {
      where.is_active = false;
    }

    // B. Xử lý tìm kiếm (Search)
    if (search && search.trim() !== '') {
        where.OR = [
            { title: { contains: search, mode: 'insensitive' } }, // Tìm theo tên phòng
            { movie: { title: { contains: search, mode: 'insensitive' } } }, // Tìm theo tên phim
            { host_user: { display_name: { contains: search, mode: 'insensitive' } } }, // Tìm theo tên hiển thị host
            { host_user: { username: { contains: search, mode: 'insensitive' } } } // Tìm theo username host
        ];
    }

    const rooms = await prisma.watchParty.findMany({
      where,
     
      orderBy: filter === 'scheduled' ? { scheduled_at: 'asc' } : { created_at: 'desc' },
      include: {
        host_user: {
          select: { id: true, username: true, display_name: true, avatar_url: true }
        },
        movie: {
          select: { title: true, poster_url: true, backdrop_url: true, media_type: true } 
        },
        episode: {
          select: {
            title: true,
            episode_number: true,
            season: {
              select: { season_number: true }
            }
          }
        },
        _count: {
          select: { members: { where: { is_online: true } } }
        }
      }
    });

    return rooms.map(room => {
      let displayTitle = room.movie?.title;
      if (room.episode) {
        displayTitle += ` - S${room.episode.season.season_number}E${room.episode.episode_number}`;
        if (room.episode.title) displayTitle += `: ${room.episode.title}`;
      }

      return {
        id: room.id,
        hostId: room.host_user_id,
        title: room.title,
        movieTitle: displayTitle, 
        originalMovieName: room.movie?.title,
        image: room.movie?.backdrop_url || room.movie?.poster_url,
        host: room.host_user.display_name || room.host_user.username,
        hostAvatar: room.host_user.avatar_url,
        viewers: room._count.members,
        isPrivate: room.is_private,
        status: filter,
        scheduledAt: room.scheduled_at,
        endedAt: room.updated_at, 
        episodeInfo: room.episode ? { 
            season: room.episode.season.season_number,
            episode: room.episode.episode_number
        } : null
      };
    });
  },

  toggleReminder: async (userId: string, partyId: string) => {
    const existing = await prisma.watchPartyReminder.findUnique({
      where: {
        party_id_user_id: { party_id: partyId, user_id: userId }
      }
    });

    if (existing) {
      await prisma.watchPartyReminder.delete({ where: { id: existing.id } });
      return { subscribed: false, message: "Đã hủy nhận thông báo." };
    } else {
      await prisma.watchPartyReminder.create({
        data: { party_id: partyId, user_id: userId }
      });
      return { subscribed: true, message: "Đã đăng ký nhận thông báo!" };
    }
  },

  cancel: async (userId: string, partyId: string) => {
    const party = await prisma.watchParty.findUnique({
      where: { id: partyId }
    });

    if (!party) throw new Error("PARTY_NOT_FOUND");

    if (party.host_user_id !== userId) {
      throw new Error("NOT_HOST");
    }

    if (party.started_at) {
        throw new Error("PARTY_ALREADY_STARTED"); 
    }

    return prisma.watchParty.delete({
      where: { id: partyId }
    });
  },

  end: async (userId: string, partyId: string) => {
    const party = await prisma.watchParty.findUnique({
      where: { id: partyId }
    });

    if (!party) {
      throw new Error("PARTY_NOT_FOUND");
    }

    if (party.host_user_id !== userId) {
      throw new Error("NOT_HOST");
    }

    return prisma.watchParty.update({
      where: { id: partyId },
      data: { 
        is_active: false,
      }
    });
  }
};
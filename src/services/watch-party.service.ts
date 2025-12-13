import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const watchPartyService = {
  // 1. TẠO PHÒNG
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

    let finalEpisodeId = data.episodeId;

    if (!finalEpisodeId) {
        const movie = await prisma.movie.findUnique({
            where: { id: data.movieId },
            include: {
                seasons: {
                    take: 1,
                    include: {
                        episodes: { take: 1 } 
                    }
                }
            }
        });


        const firstEp = movie?.seasons[0]?.episodes[0];
        if (firstEp) {
            finalEpisodeId = firstEp.id;
        } else {
            throw new Error("MOVIE_SOURCE_NOT_FOUND");
        }
    }
    // ---------------------------------------

    const joinCode = data.isPrivate 
      ? Math.random().toString(36).substring(2, 8).toUpperCase() 
      : null;

    const startedAt = data.scheduledAt ? null : new Date();

    return prisma.watchParty.create({
      data: {
        host_user_id: userId,
        title: data.title,
        movie_id: data.movieId,
        episode_id: finalEpisodeId, 
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

  // 2. LẤY DANH SÁCH (SẢNH CHỜ)
  getAll: async (filter: 'live' | 'scheduled' | 'ended' = 'live', search?: string) => {
    const where: Prisma.WatchPartyWhereInput = {};
    if (filter === 'live') {
      where.is_active = true;
      where.started_at = { not: null };
    } else if (filter === 'scheduled') {
      where.is_active = true;
      where.started_at = null;
      where.scheduled_at = { not: null };
    } else if (filter === 'ended') {
      where.is_active = false;
    }

    if (search && search.trim() !== '') {
        where.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { movie: { title: { contains: search, mode: 'insensitive' } } },
            { host_user: { display_name: { contains: search, mode: 'insensitive' } } },
            { host_user: { username: { contains: search, mode: 'insensitive' } } }
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

      if (room.episode && room.movie?.media_type === 'TV') {
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
        episodeInfo: (room.episode && room.movie?.media_type === 'TV') ? { 
            season: room.episode.season.season_number,
            episode: room.episode.episode_number
        } : null
      };
    });
  },

  // 3. ĐĂNG KÝ NHẬN THÔNG BÁO
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

  // 4. HỦY PHÒNG (Cho Scheduled)
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

  // 5. KẾT THÚC PHÒNG (Cho Live)
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
  },

  // 6. LẤY CHI TIẾT PHÒNG (Để Join)
  getDetails: async (partyId: string, userId: string) => {
    const party = await prisma.watchParty.findUnique({
        where: { id: partyId },
        include: {
            movie: { select: { title: true, poster_url: true, backdrop_url: true, description: true, release_date: true, movie_genres: { include: { genre: true } }, country: true } },
            episode: { include: { season: true } },
            host_user: { select: { id: true, username: true, display_name: true, avatar_url: true } },
            
            messages: {
                take: 50, 
                where: { is_deleted: false, is_flagged: false },
                orderBy: { created_at: 'asc' },
                include: { user: { select: { id: true, username: true, display_name: true, avatar_url: true } } }
            }
        }
    });

    if (!party) throw new Error("PARTY_NOT_FOUND");
    if (!party.is_active) throw new Error("PARTY_ENDED");

    const formattedMessages = party.messages.map((msg: any) => {
        return {
            id: msg.id,
            text: msg.message, 
            userId: msg.user_id,
            user: msg.user.display_name || msg.user.username,
            avatar: msg.user.avatar_url,
            time: msg.created_at.toISOString(), 
            isHost: msg.user_id === party.host_user_id,
            isSystem: false
        };
    });

    return {
        party,
        messages: formattedMessages,
        isHost: party.host_user_id === userId
    };
  },

  joinByCode: async (code: string) => {
      const party = await prisma.watchParty.findUnique({
          where: { join_code: code.toUpperCase().trim() },
          select: { id: true, is_active: true }
      });

      if (!party) throw new Error("INVALID_CODE");
      if (!party.is_active) throw new Error("PARTY_ENDED");

      return { roomId: party.id };
  }
};
import { prisma } from '../lib/prisma';
import { notificationService } from '../index';
import { gamificationEmitter } from '../events/gamification.events';
import { getSystemRanks } from './admin.gamification.service';

const enrichUsersWithBadge = async (
  users: Array<{
    id: string;
    display_name: string;
    avatar_url: string | null;
    xp: number;
    preferences: any;
  }>,
) => {
  const ranksConfig = await getSystemRanks();
  const ranksArray = ranksConfig
    ? Object.entries(ranksConfig)
        .map(([key, value]: [string, any]) => ({ key, ...value }))
        .filter((rank) => typeof rank.min_xp === 'number')
        .sort((a, b) => a.min_xp - b.min_xp)
    : [];

  const resolveUserRank = (xp: number) => {
    if (!ranksArray.length) {
      return 'NEWBIE';
    }

    let currentRank = ranksArray[0].key;
    for (const rank of ranksArray) {
      if (xp >= rank.min_xp) {
        currentRank = rank.key;
      }
    }

    return currentRank;
  };

  return users.map((user) => {
    const prefs = (user.preferences as Record<string, unknown>) || {};
    return {
      id: user.id,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      display_name_color: (prefs.display_name_color as string) || null,
      user_badge: resolveUserRank(user.xp),
    };
  });
};

export const getCommentsByTarget = async (targetId: string, targetType: 'movie' | 'post') => {
  const comments = await prisma.comment.findMany({
    where: {
      ...(targetType === 'movie' ? { movie_id: targetId } : { post_id: targetId }),
      parent_comment_id: null, 
      is_deleted: false,
      is_hidden: false,
    },
    include: {
      user: {
        select: {
          id: true,
          display_name: true,
          avatar_url: true,
          xp: true,
          preferences: true,
        },
      },
      replies: {
        where: {
          is_deleted: false,
          is_hidden: false
        },
        include: {
          user: {
            select: {
              id: true,
              display_name: true,
              avatar_url: true,
              xp: true,
              preferences: true,
            },
          },
        },
        orderBy: {
          created_at: 'asc', 
        },
      },
    },
    orderBy: [
      { is_pinned: 'desc' },
      { created_at: 'desc' },
    ],
  });

  const usersById = new Map<string, {
    id: string;
    display_name: string;
    avatar_url: string | null;
    xp: number;
    preferences: any;
  }>();

  for (const comment of comments) {
    usersById.set(comment.user.id, comment.user);
    for (const reply of comment.replies) {
      usersById.set(reply.user.id, reply.user);
    }
  }

  const enrichedUsers = await enrichUsersWithBadge(Array.from(usersById.values()));
  const enrichedUsersMap = new Map(enrichedUsers.map((u) => [u.id, u]));

  return comments.map((comment) => ({
    ...comment,
    user: enrichedUsersMap.get(comment.user.id) || null,
    replies: comment.replies.map((reply) => ({
      ...reply,
      user: enrichedUsersMap.get(reply.user.id) || null,
    })),
  }));
};

export const createComment = async (
  userId: string,
  targetId: string,
  targetType: 'movie' | 'post',
  comment: string,
  parentCommentId?: string,
  isSpoiler?: boolean,
  toxicityScore?: number,
  isHidden?: boolean
) => {
  let isPinned = false;
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true } });
      if (user) {
        const ranksConfig = await getSystemRanks();
        if (ranksConfig && ranksConfig.LEGEND && user.xp >= ranksConfig.LEGEND.min_xp) {
          isPinned = true;
        }
      }
    } catch (error) {
      console.error("Error setting pinned status:", error);
    }
  const newComment = await prisma.comment.create({
    data: {
      user_id: userId,
      movie_id: targetType === 'movie' ? targetId : null,
      post_id: targetType === 'post' ? targetId : null,
      comment: comment,
      parent_comment_id: parentCommentId,
      is_spoiler: isSpoiler || false,
      toxicity_score: toxicityScore || 0, 
      is_hidden: isHidden || false,
      is_pinned: isPinned || false,
    },
  });

  gamificationEmitter.emit('USER_EARNED_XP', {
    userId,
    action: 'CREATE_COMMENT'
  });

  try {
    const author = await prisma.user.findUnique({ 
      where: { id: userId },
      select: { id: true, username: true, display_name: true, is_flagged: true }
    });

    if (author?.is_flagged) {
      let targetTitle = 'Không xác định';
      if (targetType === 'movie') {
        const movie = await prisma.movie.findUnique({
          where: { id: targetId },
          select: { title: true }
        });
        targetTitle = movie?.title || 'Phim không xác định';
      } else {
        const post = await prisma.blogPost.findUnique({
          where: { id: targetId },
          select: { title: true }
        });
        targetTitle = post?.title || 'Bài viết không xác định';
      }

      const actionDescription = `đã đăng bình luận: "${comment.length > 30 ? comment.substring(0, 30) + '...' : comment}" tại ${targetType === 'movie' ? 'phim' : 'bài viết'} "${targetTitle}"`;
      await notificationService.notifyAdminsAboutFlaggedActivity(
        author.display_name || author.username,
        actionDescription,
        '/admin/comment-management?filter=flagged' 
      );
    }
  } catch (error) {
    console.error("Lỗi khi gửi cảnh báo user bị gắn cờ:", error);
  }

  const createdComment = await prisma.comment.findUnique({
    where: { id: newComment.id },
    include: {
      user: {
        select: {
          id: true,
          display_name: true,
          avatar_url: true,
          xp: true,
          preferences: true,
        },
      },
    },
  });

  if (!createdComment || !createdComment.user) {
    return createdComment;
  }

  const [enrichedUser] = await enrichUsersWithBadge([createdComment.user]);

  return {
    ...createdComment,
    user: enrichedUser,
  };
};


export const updateComment = async (
  userId: string,
  commentId: string,
  newComment: string,
  toxicityScore?: number,
  isHidden?: boolean
) => {
  return prisma.comment.updateMany({
    where: {
      id: commentId,
      user_id: userId,
      is_deleted: false,
    },
    data: {
      comment: newComment,
    },
  });
};


export const deleteComment = async (userId: string, commentId: string) => {
  return prisma.comment.updateMany({
    where: {
      id: commentId,
      user_id: userId,
    },
    data: {
      is_deleted: true,
      comment: '[Bình luận đã bị xóa]', 
    },
  });
};
export const getCommentById = async (commentId: string) => {
  return prisma.comment.findUnique({
    where: { id: commentId },
  });
};
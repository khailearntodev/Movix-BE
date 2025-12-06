import { prisma } from '../lib/prisma';
import { notificationService } from '../index';
export const getCommentsByMovie = async (movieId: string) => {
  return prisma.comment.findMany({
    where: {
      movie_id: movieId,
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
            },
          },
        },
        orderBy: {
          created_at: 'asc', 
        },
      },
    },
    orderBy: {
      created_at: 'desc', 
    },
  });
};

export const createComment = async (
  userId: string,
  movieId: string,
  comment: string,
  parentCommentId?: string,
  isSpoiler?: boolean,
  toxicityScore?: number,
  isHidden?: boolean
) => {
  const newComment = await prisma.comment.create({
    data: {
      user_id: userId,
      movie_id: movieId,
      comment: comment,
      parent_comment_id: parentCommentId,
      is_spoiler: isSpoiler || false,
      toxicity_score: toxicityScore || 0, 
      is_hidden: isHidden || false,
    },
  });

  try {
    const author = await prisma.user.findUnique({ 
      where: { id: userId },
      select: { id: true, username: true, display_name: true, is_flagged: true }
    });

    if (author?.is_flagged) {
      const movie = await prisma.movie.findUnique({
        where: { id: movieId },
        select: { title: true }
      });

      const actionDescription = `đã đăng bình luận: "${comment.length > 30 ? comment.substring(0, 30) + '...' : comment}" tại phim "${movie?.title}"`;
      await notificationService.notifyAdminsAboutFlaggedActivity(
        author.display_name || author.username,
        actionDescription,
        '/admin/comment-management?filter=flagged' 
      );
    }
  } catch (error) {
    console.error("Lỗi khi gửi cảnh báo user bị gắn cờ:", error);
  }

  return prisma.comment.findUnique({
    where: { id: newComment.id },
    include: {
      user: {
        select: {
          id: true,
          display_name: true,
          avatar_url: true,
        },
      },
    },
  });
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
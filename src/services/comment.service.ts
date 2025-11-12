import { prisma } from '../lib/prisma';

export const getCommentsByMovie = async (movieId: string) => {
  return prisma.comment.findMany({
    where: {
      movie_id: movieId,
      parent_comment_id: null, 
      is_deleted: false,
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
) => {
  const newComment = await prisma.comment.create({
    data: {
      user_id: userId,
      movie_id: movieId,
      comment: comment,
      parent_comment_id: parentCommentId,
    },
  });



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
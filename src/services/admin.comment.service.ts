import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const getAllComments = async (
  page: number,
  take: number,
  search: string,
  filter: 'all' | 'flagged' | 'hidden'
) => {
  const skip = (page - 1) * take;

  const andConditions: Prisma.CommentWhereInput[] = [
    { is_deleted: false }
  ];

  if (search) {
    andConditions.push({
      OR: [
        { comment: { contains: search, mode: 'insensitive' } },
        { user: { display_name: { contains: search, mode: 'insensitive' } } },
        { user: { username: { contains: search, mode: 'insensitive' } } },
        { movie: { title: { contains: search, mode: 'insensitive' } } },
      ],
    });
  }

  if (filter === 'hidden') {
    andConditions.push({ is_hidden: true });
  } else if (filter === 'flagged') {
    andConditions.push({
      OR: [
        { toxicity_score: { gt: 0.7 } },
        { is_spoiler: true }
      ],
    });
  }

  const where: Prisma.CommentWhereInput = {
    AND: andConditions
  };

  const [comments, total] = await prisma.$transaction([
    prisma.comment.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: { id: true, username: true, display_name: true, avatar_url: true }
        },
        movie: {
          select: { id: true, title: true, slug: true, poster_url: true }
        },
        parent_comment: {
            include: {
                user: { select: { username: true } }
            }
        }
      },
    }),
    prisma.comment.count({ where }),
  ]);

  return {
    data: comments,
    pagination: {
      page,
      take,
      total,
      totalPages: Math.ceil(total / take),
    },
  };
};

export const toggleCommentVisibility = async (commentId: string) => {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new Error('COMMENT_NOT_FOUND');

  return prisma.comment.update({
    where: { id: commentId },
    data: { is_hidden: !comment.is_hidden },
  });
};

export const deleteCommentAdmin = async (commentId: string) => {
  return prisma.comment.update({
    where: { id: commentId },
    data: { is_deleted: true },
  });
};
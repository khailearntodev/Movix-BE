import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const createBlogPost = async (data: {
  user_id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  thumbnail?: string;
  images?: string[];
  is_spoiler?: boolean;
  movie_id?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'HIDDEN' | 'ARCHIVED';
}) => {
  return prisma.blogPost.create({
    data: {
      user_id: data.user_id,
      title: data.title,
      slug: data.slug,
      content: data.content,
      excerpt: data.excerpt || null,
      thumbnail: data.thumbnail || null,
      images: data.images || [],
      is_spoiler: data.is_spoiler || false,
      movie_id: data.movie_id || null,
      status: data.status || 'PUBLISHED',
    },
    include: {
      user: {
        select: {
          id: true,
          display_name: true,
          avatar_url: true,
        },
      },
      movie: {
        select: {
          id: true,
          title: true,
          poster_url: true,
        },
      },
    },
  });
};

export const getBlogPostById = async (id: string) => {
  const post = await prisma.blogPost.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          display_name: true,
          avatar_url: true,
          username: true,
        },
      },
      movie: {
        select: {
          id: true,
          title: true,
          poster_url: true,
          slug: true,
        },
      },
      likes: {
        select: { user_id: true },
      },
      bookmarks: {
        select: { user_id: true },
      },
    },
  });

  if (post) {
    await prisma.blogPost.update({
      where: { id },
      data: { view_count: { increment: 1 } },
    });
  }

  return post;
};

export const getBlogPostBySlug = async (slug: string) => {
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: {
      user: {
        select: {
          id: true,
          display_name: true,
          avatar_url: true,
          username: true,
        },
      },
      movie: {
        select: {
          id: true,
          title: true,
          poster_url: true,
          slug: true,
        },
      },
      likes: {
        select: { user_id: true },
      },
      bookmarks: {
        select: { user_id: true },
      },
    },
  });

  if (post) {
    await prisma.blogPost.update({
      where: { slug },
      data: { view_count: { increment: 1 } },
    });
  }

  return post;
};

export const getAllBlogPosts = async (
  page: number = 1,
  limit: number = 10,
  filters?: {
    status?: string;
    movieId?: string;
    userId?: string;
    isSpoiler?: boolean;
    search?: string;
  }
) => {
  const skip = (page - 1) * limit;

  const where: Prisma.BlogPostWhereInput = {
    status: (filters?.status as any) || 'PUBLISHED',
  };

  if (filters?.movieId) {
    where.movie_id = filters.movieId;
  }

  if (filters?.userId) {
    where.user_id = filters.userId;
  }

  if (filters?.isSpoiler !== undefined) {
    where.is_spoiler = filters.isSpoiler;
  }

  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { content: { contains: filters.search, mode: 'insensitive' } },
      { excerpt: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            display_name: true,
            avatar_url: true,
          },
        },
        movie: {
          select: {
            id: true,
            title: true,
            poster_url: true,
            slug: true,
          },
        },
        _count: {
          select: {
            likes: true,
            bookmarks: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      skip,
      take: limit,
    }),
    prisma.blogPost.count({ where }),
  ]);

  return {
    data: posts,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
};

export const getUserBlogPosts = async (
  userId: string,
  page: number = 1,
  limit: number = 10,
  includePrivate: boolean = false
) => {
  const skip = (page - 1) * limit;

  const where: Prisma.BlogPostWhereInput = {
    user_id: userId,
    status: includePrivate ? { in: ['DRAFT', 'PUBLISHED', 'HIDDEN', 'ARCHIVED'] } : 'PUBLISHED',
  };

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      include: {
        movie: {
          select: {
            id: true,
            title: true,
            poster_url: true,
            slug: true,
          },
        },
        _count: {
          select: {
            likes: true,
            bookmarks: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      skip,
      take: limit,
    }),
    prisma.blogPost.count({ where }),
  ]);

  return {
    data: posts,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
};


export const BlogService = {
  createBlogPost,
  getBlogPostById,
  getBlogPostBySlug,
  getAllBlogPosts,
  getUserBlogPosts,
};

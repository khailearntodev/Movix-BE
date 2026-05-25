import { prisma } from '../lib/prisma';
import { PostStatus, Prisma } from '@prisma/client';

const visibleCommentWhere = {
  is_deleted: false,
  is_hidden: false,
};

const getEngagementCounts = async (postId: string) => {
  const [likes, comments, bookmarks] = await Promise.all([
    prisma.blogLike.count({ where: { post_id: postId } }),
    prisma.comment.count({
      where: {
        post_id: postId,
        ...visibleCommentWhere,
      },
    }),
    prisma.blogBookmark.count({ where: { post_id: postId } }),
  ]);

  return { likes, comments, bookmarks };
};

const createBlogInclude = (currentUserId?: string) => ({
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
  ...(currentUserId
    ? {
        likes: {
          where: { user_id: currentUserId },
          select: { user_id: true },
        },
        bookmarks: {
          where: { user_id: currentUserId },
          select: { user_id: true },
        },
      }
    : {}),
  _count: {
    select: {
      likes: true,
      comments: {
        where: visibleCommentWhere,
      },
      bookmarks: true,
    },
  },
});

const normalizeBlogPost = <T extends Record<string, any>>(post: T, currentUserId?: string) => {
  const count = post._count || {};
  const likes = post.likes || [];
  const bookmarks = post.bookmarks || [];
  const likeCount = Number(count.likes || 0);
  const commentCount = Number(count.comments || 0);
  const bookmarkCount = Number(count.bookmarks || 0);

  return {
    ...post,
    likes,
    bookmarks,
    _count: {
      likes: likeCount,
      comments: commentCount,
      bookmarks: bookmarkCount,
    },
    like_count: likeCount,
    comment_count: commentCount,
    bookmark_count: bookmarkCount,
    is_liked: currentUserId ? likes.some((like: { user_id: string }) => like.user_id === currentUserId) : false,
    is_bookmarked: currentUserId
      ? bookmarks.some((bookmark: { user_id: string }) => bookmark.user_id === currentUserId)
      : false,
  };
};

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

export const getBlogPostById = async (id: string, currentUserId?: string, incrementView = true) => {
  const post = await prisma.blogPost.findUnique({
    where: { id },
    include: createBlogInclude(currentUserId),
  });

  if (post && incrementView) {
    const updatedPost = await prisma.blogPost.update({
      where: { id },
      data: { view_count: { increment: 1 } },
      select: { view_count: true },
    });
    post.view_count = updatedPost.view_count;
  }

  return post ? normalizeBlogPost(post, currentUserId) : null;
};

export const getBlogPostBySlug = async (slug: string, currentUserId?: string, incrementView = true) => {
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: createBlogInclude(currentUserId),
  });

  if (post && incrementView) {
    const updatedPost = await prisma.blogPost.update({
      where: { slug },
      data: { view_count: { increment: 1 } },
      select: { view_count: true },
    });
    post.view_count = updatedPost.view_count;
  }

  return post ? normalizeBlogPost(post, currentUserId) : null;
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
  },
  currentUserId?: string
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
      include: createBlogInclude(currentUserId),
      orderBy: {
        created_at: 'desc',
      },
      skip,
      take: limit,
    }),
    prisma.blogPost.count({ where }),
  ]);

  return {
    data: posts.map((post) => normalizeBlogPost(post, currentUserId)),
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
  includePrivate: boolean = false,
  currentUserId?: string
) => {
  const skip = (page - 1) * limit;

  const where: Prisma.BlogPostWhereInput = {
    user_id: userId,
    status: includePrivate ? { in: ['DRAFT', 'PUBLISHED', 'HIDDEN', 'ARCHIVED'] } : 'PUBLISHED',
  };

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      include: createBlogInclude(currentUserId),
      orderBy: {
        created_at: 'desc',
      },
      skip,
      take: limit,
    }),
    prisma.blogPost.count({ where }),
  ]);

  return {
    data: posts.map((post) => normalizeBlogPost(post, currentUserId)),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
};
export const updateBlogPost = async (id: string, data: Partial<{
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  thumbnail?: string;
  images?: string[];
  is_spoiler?: boolean;
  movie_id?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'HIDDEN' | 'ARCHIVED';
}>) => {
  return prisma.blogPost.update({
    where: { id },
    data: {
      title: data.title,
      slug: data.slug,
      content: data.content,
      excerpt: data.excerpt,
      thumbnail: data.thumbnail,
      images: data.images,
      is_spoiler: data.is_spoiler,
      movie_id: data.movie_id,
      status: data.status,
    },
  });
};
export const deleteBlogPost = async (id: string) => {
  return prisma.blogPost.delete({
    where: { id },
  });
};
export const toggleLikeBlogPost = async (postId: string, userId: string) => {
  const existingLike = await prisma.blogLike.findUnique({
    where: {
      user_id_post_id: {
        post_id: postId,
        user_id: userId,
      },
    },
  });
  if (existingLike) {
    await prisma.blogLike.delete({
      where: {
        user_id_post_id: {
          post_id: postId,
          user_id: userId,
        },
      },
    });
    const counts = await getEngagementCounts(postId);
    return {
      liked: false,
      like_count: counts.likes,
      comment_count: counts.comments,
      bookmark_count: counts.bookmarks,
      _count: counts,
    };
  }
  await prisma.blogLike.create({
    data: {
      post_id: postId,
      user_id: userId,
    },
  });
  const counts = await getEngagementCounts(postId);
  return {
    liked: true,
    like_count: counts.likes,
    comment_count: counts.comments,
    bookmark_count: counts.bookmarks,
    _count: counts,
  };
};
export const getBlogPostLikes = async (postId: string) => {
  return prisma.blogLike.findMany({
    where: { post_id: postId },
    select: { user_id: true },
  });
};
export const toggleBookmarkBlogPost = async (postId: string, userId: string) => {
  const existingBookmark = await prisma.blogBookmark.findUnique({
    where: {
      user_id_post_id: {
        post_id: postId,
        user_id: userId,
      },
    },
  });
  if (existingBookmark) {
    await prisma.blogBookmark.delete({
      where: {
        user_id_post_id: {
          post_id: postId,
          user_id: userId,
        },
      },
    });
    const counts = await getEngagementCounts(postId);
    return {
      bookmarked: false,
      like_count: counts.likes,
      comment_count: counts.comments,
      bookmark_count: counts.bookmarks,
      _count: counts,
    };
  }
  await prisma.blogBookmark.create({
    data: {
      post_id: postId,
      user_id: userId,
    },
  });
  const counts = await getEngagementCounts(postId);
  return {
    bookmarked: true,
    like_count: counts.likes,
    comment_count: counts.comments,
    bookmark_count: counts.bookmarks,
    _count: counts,
  };
};
export const getBlogPostBookmarks = async (postId: string) => {
  return prisma.blogBookmark.findMany({
    where: { post_id: postId },
    select: { user_id: true },
  });
};
export const getSavedBlogs = async (userId: string, page: number, take: number, search?: string) => {
  const skip = (page - 1) * take;
  const where: any = {
    is_deleted: false,
    status: PostStatus.PUBLISHED,
    bookmarks: {
      some: {
        user_id: userId,
      },
    },
  }
  if (search) {
    where.title = {
      contains: search,
      mode: 'insensitive'
    };
  }

  const [blogs, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      skip: (page - 1) * take,
      take,
      include: createBlogInclude(userId),
      orderBy: { created_at: 'desc' }
    }),
    prisma.blogPost.count({
      where
    })
  ]);

  return {
    blogs: blogs.map((blog) => normalizeBlogPost(blog, userId)),
    total,
    page,
    limit: take,
    totalPages: Math.ceil(total / take)
  }
}
export const BlogService = {
  createBlogPost,
  getBlogPostById,
  getBlogPostBySlug,
  getAllBlogPosts,
  getUserBlogPosts,
  updateBlogPost,
  deleteBlogPost,
  toggleLikeBlogPost,
  getBlogPostLikes,
  toggleBookmarkBlogPost,
  getBlogPostBookmarks,
};

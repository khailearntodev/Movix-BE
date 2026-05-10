import {prisma} from '../lib/prisma';
import { Prisma, PostStatus } from '@prisma/client';

export const getAllBlogs = async(page: number, take: number, search: string, status?: string) => {
  const where: any = {
    is_deleted: false,
  }

  if (status && status !== 'ALL') {
    where.status = status as PostStatus;
  }

  if (search) {
    where.OR = [
      {title: {contains: search, mode: 'insensitive'}},
      {slug: {contains: search, mode: 'insensitive'}}
    ]
  }

  const blogs = await prisma.blogPost.findMany({
    where,
    skip: (page - 1) * take,
    take,
      include: {
          user: {
              select: { id: true, display_name: true, email: true, avatar_url: true }
          },
          movie: {
              select: { title: true }
          },
          _count: {
              select: { likes: true, bookmarks: true }
          }
      },
    orderBy: [{created_at: 'desc'}],
  })

  const total = await prisma.blogPost.count({where});

  return {
    blogs,
    total,
    totalPages: Math.ceil(total / take),
  }
}

export const updateBlogStatus = async(id: string, status: PostStatus) => {
    return await prisma.blogPost.update({
      where: {id},
      data: {status},
    })
}

export const getBlogDetail = async(id: string) => {
  return await prisma.blogPost.findUnique({
    where: {id},
    include: {
        user: true,
        movie: true
    }
  })
}
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

export const getAllPeople = async (
  page: number,
  limit: number,
  query?: string,
  role?: string
) => {
  const skip = (page - 1) * limit;

  const where: Prisma.PersonWhereInput = {
    is_deleted: false,
  };

  if (query) {
    where.name = {
      contains: query,
      mode: 'insensitive',
    };
  }

  if (role && role !== 'all') {
    where.role_type = role;
  }

  const [total, people] = await prisma.$transaction([
    prisma.person.count({ where }),
    prisma.person.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        role_type: true,
        avatar_url: true,
        tmdb_id: true,
      }
    }),
  ]);

  return {
    data: people,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getPersonDetail = async (id: string) => {
  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      movie_people: {
        where: {
            movie: { is_deleted: false, is_active: true }
        },
        include: {
          movie: {
            select: {
              id: true,
              title: true,
              original_title: true,
              poster_url: true,
              slug: true,
              release_date: true,
              media_type: true,
            },
          },
        },
        orderBy: {
            movie: { release_date: 'desc' }
        }
      },
    },
  });

  if (!person) {
    throw new Error('PERSON_NOT_FOUND');
  }

  const participatedMovies = person.movie_people.map((mp) => ({
    ...mp.movie,
    character: mp.character, 
    credit_type: mp.credit_type, 
    job: mp.credit_type === 'crew' ? 'Director/Crew' : 'Actor', 
  }));

  return {
    ...person,
    movies: participatedMovies,
  };
};
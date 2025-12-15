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
    where.role_type = {
        equals: role,
        mode: 'insensitive' 
    };
  }

  const [total, people] = await prisma.$transaction([
    prisma.person.count({ where }),
    prisma.person.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updated_at: 'desc' }, 
      include: {
        _count: {
          select: { movie_people: true },
        },
      },
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

export const createPerson = async (data: Prisma.PersonCreateInput) => {
    return await prisma.person.create({
        data: {
            name: data.name,
            role_type: data.role_type,
            gender: Number(data.gender),
            birthday: data.birthday ? new Date(data.birthday) : null,
            biography: data.biography,
            avatar_url: data.avatar_url,
        }
    });
};

export const updatePerson = async (id: string, data: Prisma.PersonUpdateInput) => {
    const exists = await prisma.person.findUnique({ where: { id } });
    if (!exists) {
        throw new Error('PERSON_NOT_FOUND');
    }

    return await prisma.person.update({
        where: { id },
        data: {
            name: data.name,
            role_type: data.role_type,
            gender: data.gender !== undefined ? Number(data.gender) : undefined,
            birthday: data.birthday ? new Date(data.birthday as string) : data.birthday,
            biography: data.biography,
            avatar_url: data.avatar_url,
        }
    });
};

export const deletePerson = async (id: string) => {
    const exists = await prisma.person.findUnique({ where: { id } });
    if (!exists) {
        throw new Error('PERSON_NOT_FOUND');
    }

    try {
        await prisma.person.delete({ where: { id } });
    } catch (error: any) {
        if (error.code === 'P2003') {
            throw new Error('FOREIGN_KEY_CONSTRAINT');
        }
        throw error;
    }
};
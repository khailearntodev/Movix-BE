import { prisma } from '../lib/prisma';

export const homepageService = {
  getAllSections: async () => {
    return prisma.homepageSection.findMany({
      where: { is_deleted: false, is_visible: true }, // Chỉ lấy section đang hiện
      orderBy: { display_order: 'asc' },
      include: {
        movie_links: {
          orderBy: { display_order: 'asc' },
          include: {
            movie: {
              select: {
                id: true,
                title: true,
                original_title: true,
                slug: true,           
                poster_url: true,
                backdrop_url: true,
                description: true,
                release_date: true,
                media_type: true,
                metadata: true,   
                movie_genres: { 
                    include: { genre: true } 
                },
                seasons: {
                    select: { id: true } 
                }
              }
            }
          }
        }
      }
    });
  },

  createSection: async (title: string, displayOrder: number) => {
    return prisma.homepageSection.create({
      data: { title, display_order: displayOrder, is_visible: true }
    });
  },

  updateSection: async (id: string, data: { title?: string, is_visible?: boolean }) => {
    return prisma.homepageSection.update({
      where: { id },
      data
    });
  },

  deleteSection: async (id: string) => {
    return prisma.homepageSection.update({
      where: { id },
      data: { is_deleted: true }
    });
  },

  addMovieToSection: async (sectionId: string, movieId: string, displayOrder: number) => {
    return prisma.sectionMovieLink.create({
      data: {
        section_id: sectionId,
        movie_id: movieId,
        display_order: displayOrder
      },
      include: {
        movie: {
          select: {
            id: true,
            title: true,
            poster_url: true,
            movie_genres: { include: { genre: true } }
          }
        }
      }
    });
  },

  removeMovieFromSection: async (sectionId: string, linkId: string) => {
    return prisma.sectionMovieLink.delete({
      where: { id: linkId } 
    });
  },

  reorderSections: async (items: { id: string; order: number }[]) => {
    const transaction = items.map((item) =>
      prisma.homepageSection.update({
        where: { id: item.id },
        data: { display_order: item.order },
      })
    );
    return prisma.$transaction(transaction);
  },

  reorderMovies: async (items: { id: string; order: number }[]) => {
    const transaction = items.map((item) =>
      prisma.sectionMovieLink.update({
        where: { id: item.id },
        data: { display_order: item.order },
      })
    );
    return prisma.$transaction(transaction);
  }
};
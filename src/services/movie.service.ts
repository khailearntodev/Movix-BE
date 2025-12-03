import { prisma } from "../lib/prisma";

export const getMovieById = async (movieId: string) => {
  try {
    const movie = await prisma.movie.findUnique({
      where: { 
        id: movieId,
        is_deleted: false 
      },
      include: {
        country: true,
        movie_genres: {
          include: { 
            genre: true 
          },
        },
        movie_people: {
          include: { 
            person: true 
          },
          orderBy: { 
            ordering: "asc" 
          },
        },
        seasons: {
          orderBy: { 
            season_number: "asc" 
          },
          include: {
            episodes: {
              orderBy: { 
                episode_number: "asc" 
              },
            },
          },
        },
      },
    });

    if (!movie) {
      throw new Error("Không tìm thấy phim");
    }

    return movie;
  } catch (error: any) {
    console.error("getMovieById error:", error);
    throw new Error(error.message || "Lỗi khi lấy thông tin phim");
  }
};
export const getSlugById = async (movieId: string) => {
    const movie = await prisma.movie.findUnique({
        where: { id: movieId },
        select: { slug: true },
    });
    return movie?.slug || null;
}
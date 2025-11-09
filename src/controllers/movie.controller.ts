import { Request, Response } from 'express';
import * as tmdbService from '../services/tmdb.service';
import { CreditType, Prisma,MediaType } from '@prisma/client';
import { prisma } from "../lib/prisma";
import { error } from 'console';

function createSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, ''); 
}

export const movieController = {
  
  getAllGenres: async (req: Request, res: Response) => {
    try {
      const genres = await prisma.genre.findMany({
        orderBy: { name: 'asc' } 
      });
      res.status(200).json(genres);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Lỗi máy chủ khi lấy genres' });
    }
  },

  getAllCountries: async (req: Request, res: Response) => {
    try {
      const countries = await prisma.country.findMany({
        orderBy: { name: 'asc' }
      });
      res.status(200).json(countries);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Lỗi máy chủ khi lấy countries' });
    }
  },

  getTrendingMovies: async (req: Request, res: Response) => {
    try {
      const movies = await prisma.movie.findMany({
        where: { is_active: true, is_deleted: false },
        orderBy: { release_date: 'desc' },
        take: 10
      });
      res.status(200).json(movies);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Lỗi máy chủ' });
    }
  },

  search: async (req: Request, res: Response) => {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Thiếu query "q"' });
    }
    const query = q as string;

    try {
      const movies = await prisma.movie.findMany({
        where: {
          title: {
            contains: query,
            mode: 'insensitive'
          }
        },
        take: 10
      });

      const people = await prisma.person.findMany({
        where: {
          name: {
            contains: query,
            mode: 'insensitive'
          }
        },
        take: 10
      });

      res.status(200).json({ movies, people });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Lỗi máy chủ' });
    }
  },

  getMovieBySlug: async (req: Request, res: Response) => {
    const { slug } = req.params; 

    try {
      console.log("getMovieBySlug slug =", slug);

      if (!slug) {
        return res.status(400).json({ error: "Slug is required" });
      }

      const movie = await prisma.movie.findUnique({
        where: { slug },         
        include: {
          country: true,
          movie_genres: {
            include: { genre: true },
          },
          movie_people: {
            include: { person: true },
            orderBy: { ordering: "asc" },
          },
          seasons: {
            orderBy: { season_number: "asc" },
            include: {
              episodes: {
                orderBy: { episode_number: "asc" },
              },
            },
          },
        },
      });

      if (!movie) {
        return res.status(404).json({ error: "Không tìm thấy phim" });
      }

      return res.json(movie);
    } catch (error: any) {
      console.error("getMovieBySlug error:", error);
      return res.status(500).json({ error: "Lỗi máy chủ" });
    }
  },
  
  getEpisodePlaybackUrl: async (req: Request, res: Response) => {
    const { id } = req.params; 
    try {
      const episode = await prisma.episode.findUnique({
        where: { id },
        select: { video_url: true }
      });

      if (!episode) {
        return res.status(404).json({ error: 'Không tìm thấy tập phim' });
      }
      res.status(200).json(episode);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Lỗi máy chủ' });
    }
  },

  filterMovies: async (req: Request, res: Response) => {
    try {
      const { q, type, genre, country, year } = req.query;
      const where: Prisma.MovieWhereInput = {
        is_active: true,
        is_deleted: false,
      };

      if (typeof q === 'string' && q.trim()) {
        where.title = {
          contains: q.trim(),
          mode: 'insensitive',
        };
      }

      if (typeof type === 'string' && type !== 'Tất cả') {
        if (type === 'phim-bo') {
          where.media_type = MediaType.TV;
        } else if (type === 'phim-le') {
          where.media_type = MediaType.MOVIE;
        }
      }

      if (genre && genre !== 'Tất cả') {
        const genreQuery = Array.isArray(genre) 
            ? (genre as string[]) 
            : [genre as string];
        const validGenres = genreQuery.filter(g => g && g !== 'Tất cả');

        if (validGenres.length > 0) {
            where.movie_genres = {
              some: {
                genre: {
                  name: {
                    in: validGenres, 
                    mode: 'insensitive',
                  },
                },
              },
            };
        }
      }

      if (typeof country === 'string' && country !== 'Tất cả') {
        where.country = {
          name: {
            equals: country,
            mode: 'insensitive',
          },
        };
      }

      if (typeof year === 'string' && year !== 'Tất cả') {
         const numericYear = parseInt(year);
         if (!isNaN(numericYear)) {
           const startDate = new Date(numericYear, 0, 1); 
           const endDate = new Date(numericYear, 11, 31); 
           where.release_date = {
             gte: startDate,
             lte: endDate,
           };
         }   
      }

      const movies = await prisma.movie.findMany({
        where,
        include: {
          country: true,
          movie_genres: {
            include: { genre: true },
          },
        },
        orderBy: {
          release_date: 'desc',
        },
        take: 35,
      });

      res.status(200).json(movies);
      
    } catch (error: any) {
      console.error("Lỗi khi lọc phim:", error);
      res.status(500).json({ message: error.message || 'Lỗi máy chủ nội bộ' });
    }
  },

  getTrending: async (req: Request, res: Response) => {
    try {
      const movies = await tmdbService.getTrendingMovies();
      res.status(200).json(movies);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  getPopularShows: async (req: Request, res: Response) => {
    try {
      const shows = await tmdbService.getPopularTvShows();
      res.status(200).json(shows);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  getByGenre: async (req: Request, res: Response) => {
    try {
      const { genreId } = req.params;
      if (!genreId) {
        return res.status(400).json({ message: 'Genre ID là bắt buộc.' });
      }
      const movies = await tmdbService.getMoviesByGenre(genreId);
      res.status(200).json(movies);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  getTmdbDetails: async (req: Request, res: Response) => {
    try {
      const { tmdbId } = req.params;
      if (!tmdbId) {
        return res.status(400).json({ error: 'Thiếu TMDB ID' });
      }

      const movieDetails = await tmdbService.getTmdbMovieDetails(tmdbId);
      res.status(200).json(movieDetails);

    } catch (error: any){
      res.status(500).json({ message: error.message || 'Lỗi máy chủ' });
    }
  },

  getTmdbTvDetails: async (req: Request, res: Response) => {
    try {
      const { tmdbId } = req.params;
      if (!tmdbId) {
        return res.status(400).json({ error: 'Thiếu TMDB ID' });
      }

      const showDetails = await tmdbService.getTmdbTvShowDetails(tmdbId);
      res.status(200).json(showDetails);

    } catch (error: any) {
      console.error("Lỗi khi lấy TMDB TV details:", error);
      res.status(500).json({ message: error.message || 'Lỗi máy chủ' });
    }
  },

  createMovie: async (req: Request, res: Response) => {
    console.log("SERVER NHẬN ĐƯỢC BODY:", req.body);
    const {
      // Step 1
      movieTitle,
      originalTitle,
      releaseDate,
      overview,
      posterUrl,
      backdropUrl,
      selectedCountry,
      selectedGenres,
      selectedMovieType,
      tmdb_id, 
      // Step 2
      singleMovieFile, 
      seasons, 
      // Step 3
      people 
    } = req.body;

    if (!movieTitle) {
      return res.status(400).json({ error: 'Tên phim là bắt buộc' });
    }
    if (!selectedCountry) {
        return res.status(400).json({ error: 'Quốc gia là bắt buộc' });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        // --- 1. Xử lý Quốc gia ---
        const country = await tx.country.upsert({
          where: { name: selectedCountry },
          update: {},
          create: { name: selectedCountry },
        });

        // --- 2. Tạo Phim (Movie) ---
        const movieSlug = createSlug(movieTitle);
        const mediaType: MediaType = (selectedMovieType === 'series') ? 'TV' : 'MOVIE';
        const newMovie = await tx.movie.create({
          data: {
            title: movieTitle,
            original_title: originalTitle || movieTitle,
            slug: `${movieSlug}-${Date.now()}`, 
            tmdb_id: tmdb_id ? parseInt(tmdb_id) : null,
            media_type: mediaType,
            description: overview,
            release_date: releaseDate ? new Date(releaseDate) : null,
            poster_url: posterUrl,
            backdrop_url: backdropUrl,
            country_id: country.id,
            is_active: true, 
            is_deleted: false,
          },
        });

        // --- 3. Xử lý Thể loại (Genres) ---
        if (selectedGenres && Array.isArray(selectedGenres) && selectedGenres.length > 0) {
          const genreLinks = await Promise.all(
            selectedGenres.map(async (genre: { id: string, name: string }) => {
              const dbGenre = await tx.genre.upsert({
                where: { name: genre.name },
                update: {},
                create: { name: genre.name },
              });
              return {
                movie_id: newMovie.id,
                genre_id: dbGenre.id,
              };
            })
          );
          await tx.movieGenre.createMany({
            data: genreLinks,
          });
        }

        // --- 4. Xử lý Diễn viên/Đạo diễn (People)  ---
        if (people && Array.isArray(people) && people.length > 0) {
          const peopleLinks = await Promise.all(
            people.map(async (person: any, index: number) => {
              
              const personTmdbId = person.id ? parseInt(person.id) : null;
              
              let dbPerson;
              if (personTmdbId) {
                dbPerson = await tx.person.upsert({
                    where: { tmdb_id: personTmdbId },
                    create: {
                      tmdb_id: personTmdbId,
                      name: person.name,
                      avatar_url: person.avatarUrl,
                      role_type: person.role,
                    },
                    update: {
                      name: person.name,
                      avatar_url: person.avatarUrl,
                      role_type: person.role,
                    },
                });
              } else {
                 dbPerson = await tx.person.create({
                    data: {
                        name: person.name,
                        avatar_url: person.avatarUrl,
                        role_type: person.role,
                        tmdb_id: null 
                    }
                });
              }
              return {
                movie_id: newMovie.id,
                person_id: dbPerson.id,
                character: person.character,
                credit_type: person.role === 'director' ? CreditType.crew : CreditType.cast, 
                ordering: index + 1,
              };
            })
          );
          await tx.moviePerson.createMany({
            data: peopleLinks,
          });
        }

        // --- 5. Xử lý Tập phim (Episodes/Seasons) ---
        if (selectedMovieType === 'series' && seasons && Array.isArray(seasons) && seasons.length > 0) {
          // --- PHIM BỘ ---
          for (const [seasonIndex, season] of seasons.entries()) {
            const newSeason = await tx.season.create({
              data: {
                movie_id: newMovie.id,
                season_number: seasonIndex + 1,
                title: (season as any).name, 
              },
            });
            
            if ((season as any).episodes && Array.isArray((season as any).episodes)) {
              const validEpisodes = (season as any).episodes
                .filter((ep: any) => ep.title && ep.fileName)
                .map((ep: any, epIndex: number) => ({
                  season_id: newSeason.id, 
                  episode_number: epIndex + 1,
                  title: ep.title,
                  video_url: ep.fileName,
                  runtime: ep.duration, 
                }));

              if (validEpisodes.length > 0) {
                await tx.episode.createMany({
                  data: validEpisodes,
                });
              }
            }
          }
        }
        else if (selectedMovieType === 'single' && singleMovieFile) {
          // --- PHIM LẺ ---
          const dummySeason = await tx.season.create({
              data: {
                  movie_id: newMovie.id,
                  season_number: 1, 
                  title: "Season 1", 
              }
          });

          await tx.episode.create({
            data: {
              season_id: dummySeason.id, 
              episode_number: 1,
              title: "Bản đầy đủ",
              video_url: (singleMovieFile as any).fileName, 
              runtime: (singleMovieFile as any).duration || 0,
            },
          });
        }
        return newMovie;
      });
        res.status(201).json({ 
        message: "Tạo phim thành công!", 
        data: result 
      });
    
    } catch (error: any) {
      console.error("Lỗi khi tạo phim:", error);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = (error.meta?.target as string[])?.join(', '); 
        return res.status(409).json({ // 409 Conflict
          message: `Thất bại. Đã tồn tại phim với ${target} này.`,
          error: `Unique constraint violation on ${target}`
        });
      res.status(500).json({ 
        message: error.message || 'Lỗi máy chủ khi tạo phim' 
      });
    }
    }
  }
}
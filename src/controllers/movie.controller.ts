import { Request, Response } from 'express';
import * as tmdbService from '../services/tmdb.service';
import { CreditType, Prisma, MediaType } from '@prisma/client';
import { prisma } from "../lib/prisma";
import { error } from 'console';
import { movieService } from '../services/movie.service';
import * as recommendationService from '../services/recommend.service';

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

  getMovieById: async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Thiếu ID phim" });
    }
    try {
      const movie = await prisma.movie.findUnique({
        where: { id },
        include: {
          country: true,
          movie_genres: { include: { genre: true } },
          movie_people: {
            include: { person: true },
            orderBy: { ordering: "asc" },
          },
          seasons: {
            orderBy: { season_number: "asc" },
            include: {
              episodes: { orderBy: { episode_number: "asc" } },
            },
          },
        },
      });

      if (!movie || movie.is_deleted) {
        return res.status(404).json({ error: "Không tìm thấy phim" });
      }

      return res.status(200).json(movie);
    } catch (error: any) {
      console.error("getMovieById controller error:", error);
      return res.status(500).json({ error: error.message || "Lỗi máy chủ" });
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
      const movies = await movieService.getTrendingMovies();
      res.status(200).json(movies);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Lỗi máy chủ' });
    }
  },

  getTrendingShows: async (req: Request, res: Response) => {
    try {
      const shows = await movieService.getPopularShows();
      res.status(200).json(shows);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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

      const recommendations = await recommendationService.getSimilarMovies(movie.id);

      return res.json({
        ...movie,
        recommendations: recommendations 
      });
    } catch (error: any) {
      console.error("getMovieBySlug error:", error);
      return res.status(500).json({ error: "Lỗi máy chủ" });
    }
  },
  getPlaybackBySlug: async (req: Request, res: Response) => {
    const { slug } = req.params;
    const seasonNumber = req.query.season ? Number(req.query.season) : null;
    const episodeNumber = req.query.episode ? Number(req.query.episode) : null;

    try {
      const movie = await prisma.movie.findUnique({
        where: { slug },
        include: {
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

      if (movie.media_type === MediaType.MOVIE) {
        const season = movie.seasons[0];
        if (!season) {
          return res.status(500).json({ error: "Phim lẻ không có season" });
        }

        const episode = season.episodes[0];
        if (!episode || !episode.video_url) {
          return res
            .status(500)
            .json({ error: "Phim lẻ không có episode/video" });
        }

        return res.json({
          media_type: movie.media_type,
          movie_id: movie.id,
          season_id: season.id,
          episode_id: episode.id,
          season_number: season.season_number,
          episode_number: episode.episode_number,
          title: episode.title ?? movie.title,
          video_url: episode.video_url,
          runtime: episode.runtime,
        });
      }
      const targetSeasonNumber =
        seasonNumber ?? movie.seasons[0]?.season_number;
      const season = movie.seasons.find(
        (s) => s.season_number === targetSeasonNumber
      );

      if (!season) {
        return res.status(404).json({ error: "Không tìm thấy season" });
      }

      const targetEpisodeNumber =
        episodeNumber ?? season.episodes[0]?.episode_number;
      const episode = season.episodes.find(
        (e) => e.episode_number === targetEpisodeNumber
      );

      if (!episode || !episode.video_url) {
        return res.status(404).json({ error: "Không tìm thấy tập phim" });
      }

      return res.json({
        media_type: movie.media_type,
        movie_id: movie.id,
        season_id: season.id,
        episode_id: episode.id,
        season_number: season.season_number,
        episode_number: episode.episode_number,
        title:
          episode.title ??
          `${movie.title} - Tập ${episode.episode_number}`,
        video_url: episode.video_url,
        runtime: episode.runtime,
      });
    } catch (error) {
      console.error("getPlaybackBySlug error:", error);
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
      const { q, type, genre, country, year, page = '1', take = '35', status } = req.query;

      const pageNum = parseInt(page as string, 10);
      const takeNum = parseInt(take as string, 10); 
      const skip = (pageNum - 1) * takeNum;

      const where: Prisma.MovieWhereInput = {};

      if (status !== 'all') {
        where.is_active = true;
        where.is_deleted = false;
      }

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

      const [totalMovies, movies] = await prisma.$transaction([
        prisma.movie.count({ where }),
        prisma.movie.findMany({
          where,
          include: {
            country: true,
            movie_genres: {
              include: { genre: true },
            },
            seasons: {
              include: {
                _count: {
                  select: { episodes: true }
                }
              }
            }
          },
          orderBy: {
            release_date: 'desc',
          },
          take: takeNum,
          skip: skip,
        })
      ]);

      res.status(200).json({
        data: movies,
        pagination: {
          page: pageNum,
          take: takeNum,
          total: totalMovies,
          totalPages: Math.ceil(totalMovies / takeNum),
        }
      });

    } catch (error: any) {
      console.error("Lỗi khi lọc phim:", error);
      res.status(500).json({ message: error.message || 'Lỗi máy chủ nội bộ' });
    }
  },

  getTrendingTMDB: async (req: Request, res: Response) => {
    try {
      const movies = await tmdbService.getTrendingMovies();
      res.status(200).json(movies);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  getPopularShowsTMDB: async (req: Request, res: Response) => {
    try {
      const shows = await tmdbService.getPopularTvShows();
      res.status(200).json(shows);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  getByGenreLanding: async (req: Request, res: Response) => {
    try {
      const genreId = req.params.id || req.params.genreId;
      if (!genreId) {
        return res.status(400).json({ message: 'Genre ID là bắt buộc.' });
      }
      //const movies = await tmdbService.getMoviesByGenre(genreId);
      const movies = await movieService.getMoviesByGenre(genreId);
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

    } catch (error: any) {
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
      trailerUrl,
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
            trailer_url: trailerUrl,
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
              const personDataUpdate = {
                name: person.name,
                avatar_url: person.avatarUrl || person.profile_path,
                role_type: person.role, 
              
                biography: person.biography || null,
                birthday: person.birthday ? new Date(person.birthday) : null,

                gender: person.gender ? parseInt(person.gender) : 0,
              };

              let dbPerson;
              if (personTmdbId) {
                dbPerson = await tx.person.upsert({
                  where: { tmdb_id: personTmdbId },
                  create: {
                    tmdb_id: personTmdbId,
                    ...personDataUpdate
                  },
                  update: personDataUpdate,
                });
              } else {
                dbPerson = await tx.person.create({
                  data: {
                    ...personDataUpdate,
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
          
          await tx.moviePerson.createMany({ data: peopleLinks });
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
        return res.status(409).json({
          message: `Thất bại. Đã tồn tại phim với ${target} này.`,
          error: `Unique constraint violation on ${target}`
        });
      res.status(500).json({ 
        message: error.message || 'Lỗi máy chủ khi tạo phim' 
      });
    }
    }
  },

  deleteMovie: async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      await prisma.movie.update({
        where: { id: id },
        data: { 
          is_deleted: true,
          is_active: false, 
        },
      });
      res.status(200).json({ message: "Đã xóa phim thành công." });
    } catch (error) {
      console.error("Lỗi khi xóa phim:", error);
      res.status(500).json({ error: "Lỗi máy chủ khi xóa phim" });
    }
  },

  updateMovie: async (req: Request, res: Response) => {
    const { id } = req.params;

    console.log("--- DEBUG: UPDATE MOVIE ---");
    console.log("Attempting to update movie with ID (from req.params.id):", id);

    const data = req.body;

    try {
      const result = await prisma.$transaction(async (tx) => {

        let finalCountryId = data.country_id;
            if (data.country && data.country.name) {
                const countryName = data.country.name.trim();
                    const dbCountry = await tx.country.findFirst({
                    where: {
                        name: {
                            equals: countryName,
                            mode: 'insensitive' 
                        }
                    }
                });

                if (dbCountry) {
                    finalCountryId = dbCountry.id;
                } else {
                    const newCountry = await tx.country.create({
                        data: { name: countryName }
                    });
                    finalCountryId = newCountry.id;
                }
            }

        const updatedMovie = await tx.movie.update({
          where: { id: id },
          data: {
            title: data.title,
            original_title: data.original_title,
            description: data.description,
            trailer_url: data.trailer_url,
            release_date: data.release_date ? new Date(data.release_date) : null,
            poster_url: data.poster_url,
            backdrop_url: data.backdrop_url,
            media_type: data.media_type,
            is_active: data.is_active,
            country_id: finalCountryId,
          },
        });

        await tx.movieGenre.deleteMany({
            where: { movie_id: id }
        });
        if (data.movie_genres && Array.isArray(data.movie_genres)) {
            const genreLinks = await Promise.all(
                data.movie_genres.map(async (mg: any) => {
                    const genreName = mg.genre.name;
                    const dbGenre = await tx.genre.upsert({
                        where: { name: genreName },
                        update: {},
                        create: { name: genreName },
                    });
                    return {
                        movie_id: id,
                        genre_id: dbGenre.id,
                    };
                })
            );
            if (genreLinks.length > 0) {
                await tx.movieGenre.createMany({
                    data: genreLinks,
                });
            }
        }

        await tx.moviePerson.deleteMany({
            where: { movie_id: id }
        });
        if (data.movie_people && Array.isArray(data.movie_people)) {
            const peopleLinks = await Promise.all(
              data.movie_people.map(async (mp: any, index: number) => {
                  if (!mp.person?.id) {
                      throw new Error(`Thiếu person.id cho diễn viên ${mp.person?.name}`);
                  }

                  let finalPersonId = mp.person.id;
                  
                  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalPersonId);

                  if (!isUuid) {
                    const tmdbId = parseInt(finalPersonId); 
                    
                    const personDataUpdate = {
                        name: mp.person.name,
                        avatar_url: mp.person.avatar_url || mp.person.profile_path, 
                        role_type: mp.person.role_type || (mp.credit_type === 'crew' ? 'Director' : 'Actor'),
                        biography: mp.person.biography || null,
                        birthday: mp.person.birthday ? new Date(mp.person.birthday) : null,
                        gender: mp.person.gender ? parseInt(mp.person.gender) : 0,
                    }

                    if (!isNaN(tmdbId)) {
                        const dbPerson = await tx.person.upsert({
                            where: { tmdb_id: tmdbId },
                            create: {
                                tmdb_id: tmdbId,
                                ...personDataUpdate 
                            },
                            update: personDataUpdate 
                        });
                        finalPersonId = dbPerson.id;
                    } else {
                        const dbPerson = await tx.person.create({
                            data: {
                                ...personDataUpdate,
                                tmdb_id: null 
                            }
                        });
                        finalPersonId = dbPerson.id;
                    }
                }

                return {
                    movie_id: id,
                    person_id: finalPersonId,
                    character: mp.character,
                    credit_type: mp.credit_type,
                    ordering: mp.ordering || index + 1,
                };
            })
        );
        
        if (peopleLinks.length > 0) {
            await tx.moviePerson.createMany({
                data: peopleLinks,
            });
        }
      }
        const oldSeasons = await tx.season.findMany({
            where: { movie_id: id },
            select: { id: true }
        });
        if (oldSeasons.length > 0) {
            await tx.episode.deleteMany({
                where: { season_id: { in: oldSeasons.map(s => s.id) } }
            });
            await tx.season.deleteMany({
                where: { movie_id: id }
            });
        }

        if (data.seasons && Array.isArray(data.seasons)) {
            for (const [seasonIndex, season] of data.seasons.entries()) {
                const newSeason = await tx.season.create({
                    data: {
                        movie_id: id,
                        season_number: season.season_number || seasonIndex + 1,
                        title: season.title || season.name || `Mùa ${seasonIndex + 1}`, 
                    },
                });
                
                if (season.episodes && Array.isArray(season.episodes)) {
                    const validEpisodes = season.episodes
                        .map((ep: any, epIndex: number) => ({
                            season_id: newSeason.id, 
                            episode_number: ep.episode_number || epIndex + 1,
                            title: ep.title,
                            video_url: ep.video_url,
                            runtime: ep.runtime ? parseInt(ep.runtime) : 0, 
                        }));

                    if (validEpisodes.length > 0) {
                        await tx.episode.createMany({
                            data: validEpisodes,
                        });
                    }
                }
            }
        }
        return updatedMovie;
      });

      res.status(200).json({ 
        message: "Cập nhật phim thành công!", 
        data: result 
      });
    
    } catch (error: any) {
      console.error("Lỗi khi cập nhật phim:", error);
      res.status(500).json({ 
        message: error.message || 'Lỗi máy chủ khi cập nhật phim' 
      });
    }
  },
  getRecommendationsForUser: async (req: Request, res: Response) => {
    try {
      const userId = req.userId; 
      if (!userId) {
        return res.status(401).json({ message: 'Bạn cần đăng nhập để nhận gợi ý.' });
      }

      const movies = await recommendationService.getPersonalizedRecommendations(userId);
      
      res.status(200).json({
        message: 'Gợi ý phim dành cho bạn',
        data: movies
      });
    } catch (error) {
      console.error("Personal Recommendation Error:", error);
      res.status(500).json({ message: 'Lỗi khi lấy danh sách gợi ý.' });
    }
  },
}
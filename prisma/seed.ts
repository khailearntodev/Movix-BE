import { PrismaClient, MediaType, CreditType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ===========================================
// DATA CƠ SỞ 
// ===========================================

const allGenres = [
  'Hành Động', 'Phiêu Lưu', 'Hoạt Hình', 'Hài', 'Hình Sự', 'Tài Liệu', 'Chính Kịch',
  'Gia Đình', 'Giả Tưởng', 'Lịch Sử', 'Kinh Dị', 'Nhạc', 'Bí Ẩn', 'Lãng Mạn',
  'Khoa Học Viễn Tưởng', 'Phim Truyền Hình', 'Gay Cấn', 'Chiến Tranh', 'Miền Tây', 
  'Anime', 'Tâm Lý', 'Chiếu Rạp', 'Chuyển Thể', 'Chính Luận', 'Chính Trị', 
  'Chương Trình Truyền Hình', 'Concert Film', 'Cung Đấu', 'Cuối Tuần', 'Cách Mạng', 
  'Cổ Trang', 'Cổ Tích', 'Cổ Điển', 'DC', 'Disney', 'Hoàng Cung', 'Học Đường', 
  'Khoa Học', 'Kinh Điển', 'Kịch Nói', 'Kỳ Ảo', 'LGBT+', 'Live Action', 'Marvel', 
  'Miền Viễn Tây', 'Nghề Nghiệp', 'Người Mẫu', 'Nhạc Kịch', 'Phép Thuật', 
  'Siêu Anh Hùng', 'Thiếu Nhi', 'Thần Thoại', 'Thể Thao', 'Truyền Hình Thực Tế', 
  'Tuổi Teen', 'Tội phạm', 'Tình Cảm', 'Tập Luyện', 'Viễn Tưởng', 'Võ Thuật', 
  'Xuyên Không', 'Đấu Thương', 'Đời Thường', 'Ẩm Thực'
];

const allCountries = [
  'Mỹ', 'Anh', 'Hàn Quốc', 'Nhật Bản', 'Trung Quốc', 'Việt Nam', 
  'Pháp', 'Đức', 'Thái Lan', 'Ấn Độ', 'Tây Ban Nha', 'Canada', 'Hồng Kông', 'Úc', 'Đài Loan' 
];

// ===========================================
// HELPER FUNCTIONS
// ===========================================

const movies: any[] = [];

const createMovie = async (data: any, genres: any[], casts: any[] = []) => {
    const validGenres = genres.filter(g => g !== undefined && g !== null);
    
    const isSingleMovie = data.media_type === MediaType.MOVIE;
    const initialSeasons = isSingleMovie ? {
        create: {
            season_number: 1,
            title: "Season 1",
            episodes: {
                create: {
                    episode_number: 1,
                    title: data.title,
                    runtime: 120, 
                    video_url: data.trailer_url || 'https://www.youtube.com/embed/placeholder-url'
                }
            }
        }
    } : undefined;

    const movie = await prisma.movie.create({
        data: {
            ...data,
            movie_genres: { create: validGenres.map(id => ({ genre_id: id })) },
            movie_people: { create: casts },
            seasons: initialSeasons, 
        }
    });
    movies.push(movie);
    return movie;
};

async function main() {
  console.log('Bat dau qua trinh seed du lieu...');

  console.log('Dang don dep du lieu cu...');
  const tableNames = [
    'sectionMovieLink', 'homepageSection', 'watchPartyMember', 'watchParty',
    'playlistMovie', 'playlist', 'favourite', 'watchHistory', 'comment', 'rating',
    'episode', 'season', 'moviePerson', 'person', 'movieGenre', 'genre',
    'banner', 'notification', 'chatbotLog', 'userFlagLog', 'passwordReset',
    'movie', 'country', 'refreshToken', 'user', 'role'
  ];
  for (const tableName of tableNames) {
    // @ts-ignore
    await prisma[tableName].deleteMany();
  }

  // 2. Tạo Roles & Users
  console.log('Dang tao Roles va Users...');
  const adminRole = await prisma.role.create({ data: { name: 'Admin', description: 'Quản trị viên' } });
  const userRole = await prisma.role.create({ data: { name: 'User', description: 'Người dùng' } });

  const hashedPassword = await bcrypt.hash('123456', 10);

  const adminUser = await prisma.user.create({
    data: {
      username: 'admin', password: hashedPassword, email: 'admin@movix.com',
      display_name: 'Admin', role_id: adminRole.id, status: 'active',
      avatar_url: 'https://github.com/shadcn.png',
    },
  });

  const normalUser = await prisma.user.create({
    data: {
      username: 'user1', password: hashedPassword, email: 'user1@movix.com',
      display_name: 'Khải Dev', role_id: userRole.id, status: 'active',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    },
  });

  // 3. Tạo Countries & Genres
  console.log('Dang tao Quoc gia va The loai...');
  await prisma.country.createMany({ data: allCountries.map(name => ({ name })), skipDuplicates: true });
  await prisma.genre.createMany({ data: allGenres.map(name => ({ name })), skipDuplicates: true });

  // Helper để lấy ID
  const getCountry = async (name: string) => (await prisma.country.findUnique({ where: { name } }))?.id;
  const getGenre = async (name: string) => (await prisma.genre.findUnique({ where: { name } }))?.id;

  const [cUS, cKR, cVN, cJP] = await Promise.all([
    getCountry('Mỹ'), getCountry('Hàn Quốc'), getCountry('Việt Nam'), getCountry('Nhật Bản')
  ]);
  // Lấy ID của các Genre cơ bản được sử dụng
  const [gHanhDong, gKHOAHOC, gPhieuLuu, gHai, gKinhDi, gLangMan, gHoatHinh, gAnime, gChinhKich, gGayCan, gTamLy, gGiaDinh, gNhac, gHinhSu, gBiAn, gGiaTuong] = await Promise.all([
    getGenre('Hành Động'), getGenre('Khoa Học Viễn Tưởng'), getGenre('Phiêu Lưu'), getGenre('Hài'), getGenre('Kinh Dị'),
    getGenre('Lãng Mạn'), getGenre('Hoạt Hình'), getGenre('Anime'), getGenre('Chính Kịch'), getGenre('Gay Cấn'),
    getGenre('Tâm Lý'), getGenre('Gia Đình'), getGenre('Nhạc'), getGenre('Hình Sự'), getGenre('Bí Ẩn'), getGenre('Giả Tưởng')
  ]);
  
  // Kiểm tra null cho các Country/Genre ID quan trọng (từ seed2)
   if (!cUS || !cKR || !cVN) {
     throw new Error("Không thể tìm thấy các quốc gia cơ bản (Mỹ, Hàn Quốc, Việt Nam).");
   }
   if (!gHanhDong || !gKHOAHOC || !gChinhKich || !gGayCan) {
     throw new Error("Không thể tìm thấy các thể loại cơ bản (Hành Động, Khoa Học Viễn Tưởng, Chính Kịch, Gay Cấn).");
   }

  // 4. Tạo Persons
  console.log('Dang tao Dien vien va Dao dien...');
  const peopleData = [
    // Đạo diễn
    { name: 'Christopher Nolan', role: 'director' },
    { name: 'Bong Joon-ho', role: 'director' },
    { name: 'Makoto Shinkai', role: 'director' },
    { name: 'Hayao Miyazaki', role: 'director' },
    { name: 'Victor Vũ', role: 'director' },
    // Diễn viên Hollywood
    { name: 'Leonardo DiCaprio', role: 'actor' },
    { name: 'Robert Downey Jr.', role: 'actor' },
    { name: 'Bryan Cranston', role: 'actor' },
    { name: 'Christian Bale', role: 'actor' },
    { name: 'Keanu Reeves', role: 'actor' },
    { name: 'Emma Stone', role: 'actor' },
    { name: 'Ryan Gosling', role: 'actor' },
    { name: 'Matthew McConaughey', role: 'actor' },
    { name: 'Anne Hathaway', role: 'actor' },
    { name: 'Jessica Chastain', role: 'actor' },
    { name: 'Tom Hardy', role: 'actor' },
    { name: 'Cillian Murphy', role: 'actor' },
    { name: 'Scarlett Johansson', role: 'actor' },
    { name: 'Chris Evans', role: 'actor' },
    { name: 'Chris Hemsworth', role: 'actor' },
    { name: 'Mark Ruffalo', role: 'actor' },
    // Diễn viên Châu Á
    { name: 'Lee Jung-jae', role: 'actor' },
    { name: 'Gong Yoo', role: 'actor' },
    { name: 'Ma Dong-seok', role: 'actor' },
    { name: 'Song Kang-ho', role: 'actor' },
    { name: 'Lee Sun-kyun', role: 'actor' },
    { name: 'Cho Yeo-jeong', role: 'actor' },
    // Diễn viên Việt Nam
    { name: 'Trấn Thành', role: 'actor' },
    { name: 'Phương Anh Đào', role: 'actor' },
    { name: 'Tuấn Trần', role: 'actor' },
    { name: 'Trúc Anh', role: 'actor' },
    { name: 'Trần Nghĩa', role: 'actor' }
  ];

  const people: Record<string, any> = {};
  for (const p of peopleData) {
    people[p.name] = await prisma.person.create({ data: { name: p.name, role_type: p.role } });
  }

  // ================= PHIM LẺ (MOVIES) =================
  console.log('Dang tao Phim le...');

  const m_inception = await createMovie({
    title: 'Kẻ Đánh Cắp Giấc Mơ', original_title: 'Inception', slug: 'inception', tmdb_id: 27205, // ID giả định
    description: 'Một kẻ cắp chuyên nghiệp đánh cắp thông tin bằng cách xâm nhập vào tiềm thức của mục tiêu.',
    release_date: new Date('2010-07-16'), country_id: cUS, media_type: MediaType.MOVIE,
    poster_url: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/ztZ4vw151mw04Bg6rqJLQGBAmvn.jpg',
    trailer_url: 'https://vip.opstream11.com/20220314/1901_ef246108/index.m3u8',
    metadata: { tmdb_rating: 8.8, duration: '2h 28m' }
  }, [gKHOAHOC, gHanhDong, gPhieuLuu], [
    { person_id: people['Christopher Nolan'].id, credit_type: CreditType.crew, character: 'Director' },
    { person_id: people['Leonardo DiCaprio'].id, credit_type: CreditType.cast, character: 'Dom Cobb', ordering: 1 },
    { person_id: people['Tom Hardy'].id, credit_type: CreditType.cast, character: 'Eames', ordering: 2 },
    { person_id: people['Cillian Murphy'].id, credit_type: CreditType.cast, character: 'Robert Fischer', ordering: 3 }
  ]);

  const m_interstellar = await createMovie({
    title: 'Hố Đen Tử Thần', original_title: 'Interstellar', slug: 'interstellar', tmdb_id: 157336, // ID giả định
    description: 'Một nhóm nhà thám hiểm sử dụng lỗ sâu mới được phát hiện để vượt qua các giới hạn của việc du hành không gian.',
    release_date: new Date('2014-11-07'), country_id: cUS, media_type: MediaType.MOVIE,
    poster_url: 'https://image.tmdb.org/t/p/original/if4TI9LbqNIrzkoOgWjX5PZYDYe.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/ln2Gre6WdxWPjLPFRLe133jXWsh5.jpg',
    metadata: { tmdb_rating: 8.6, duration: '2h 49m' }
  }, [gKHOAHOC, gPhieuLuu, gChinhKich], [
    { person_id: people['Christopher Nolan'].id, credit_type: CreditType.crew, character: 'Director' },
    { person_id: people['Matthew McConaughey'].id, credit_type: CreditType.cast, character: 'Cooper', ordering: 1 },
    { person_id: people['Anne Hathaway'].id, credit_type: CreditType.cast, character: 'Brand', ordering: 2 },
  ]);

  const m_endgame = await createMovie({
    title: 'Avengers: Hồi Kết', original_title: 'Avengers: Endgame', slug: 'avengers-endgame', tmdb_id: 299534, // ID giả định
    description: 'Vũ trụ điêu tàn. Avengers tập hợp một lần nữa để đảo ngược hành động của Thanos.',
    release_date: new Date('2019-04-26'), country_id: cUS, media_type: MediaType.MOVIE,
    poster_url: 'https://image.tmdb.org/t/p/original/8go3YE9sBMQaCXEx23j6BAfeuxd.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg',
    trailer_url: 'https://vip.opstream14.com/20220509/11208_25f9635f/index.m3u8',
    metadata: { tmdb_rating: 8.3, duration: '3h 1m' }
  }, [gHanhDong, gPhieuLuu, gKHOAHOC], [
    { person_id: people['Robert Downey Jr.'].id, credit_type: CreditType.cast, character: 'Iron Man', ordering: 1 },
    { person_id: people['Chris Evans'].id, credit_type: CreditType.cast, character: 'Captain America', ordering: 2 },
  ]);

  const m_johnwick = await createMovie({
    title: 'Sát Thủ John Wick', original_title: 'John Wick', slug: 'john-wick', tmdb_id: 24584, // ID giả định
    description: 'Một cựu sát thủ tái xuất giang hồ để trả thù.',
    release_date: new Date('2014-10-24'), country_id: cUS, media_type: MediaType.MOVIE,
    poster_url: 'https://image.tmdb.org/t/p/original/8CYSvYTw9tbFynivdcBcoqRWPGM.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/vL5LR6WdxWPjLPFRLe133jXWsh5.jpg',
    metadata: { tmdb_rating: 7.4, duration: '1h 41m' }
  }, [gHanhDong, gGayCan, gHinhSu], [
    { person_id: people['Keanu Reeves'].id, credit_type: CreditType.cast, character: 'John Wick', ordering: 1 }
  ]);

  const m_lalaland = await createMovie({
    title: 'Những Kẻ Khờ Mộng Mơ', original_title: 'La La Land', slug: 'la-la-land', tmdb_id: 313334, // ID giả định
    description: 'Một nữ diễn viên đầy tham vọng và một nhạc sĩ jazz yêu nhau.',
    release_date: new Date('2016-12-09'), country_id: cUS, media_type: MediaType.MOVIE,
    poster_url: 'https://image.tmdb.org/t/p/original/gN1VfkONPYb7frEKfpCFTHRMxj3.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/qJeU7KM4nR2C1TuUmnkpLMU7mh.jpg',
    metadata: { tmdb_rating: 7.9, duration: '2h 8m' }
  }, [gLangMan, gChinhKich, gNhac], [
    { person_id: people['Emma Stone'].id, credit_type: CreditType.cast, character: 'Mia', ordering: 1 },
    { person_id: people['Ryan Gosling'].id, credit_type: CreditType.cast, character: 'Sebastian', ordering: 2 }
  ]);

  const m_parasite = await createMovie({
    title: 'Ký Sinh Trùng', original_title: 'Gisaengchung', slug: 'parasite', tmdb_id: 496243, // ID giả định
    description: 'Gia đình Ki-taek thất nghiệp, sống bám vào nhau.',
    release_date: new Date('2019-05-30'), country_id: cKR, media_type: MediaType.MOVIE,
    poster_url: 'https://image.tmdb.org/t/p/original/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/hiKmpZNUZrfWdLRngjmxLtzUBOD.jpg',
    metadata: { tmdb_rating: 8.5, duration: '2h 12m' }
  }, [gHai, gGayCan, gChinhKich], [
    { person_id: people['Bong Joon-ho'].id, credit_type: CreditType.crew, character: 'Director' },
    { person_id: people['Song Kang-ho'].id, credit_type: CreditType.cast, character: 'Ki-taek', ordering: 1 },
  ]);

  const m_yourname = await createMovie({
    title: 'Tên Cậu Là Gì?', original_title: 'Kimi no Na wa.', slug: 'your-name', tmdb_id: 372058, // ID giả định
    description: 'Hai người lạ thấy mình được liên kết với nhau theo một cách kỳ lạ qua những giấc mơ.',
    release_date: new Date('2016-08-26'), country_id: cJP, media_type: MediaType.MOVIE,
    poster_url: 'https://image.tmdb.org/t/p/w500/q719jXXEzOoYaps6babgKnONONX.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/dIWwZW7dJJtqC6CgWzhYkypQDrm.jpg',
    metadata: { tmdb_rating: 8.6, duration: '1h 46m' }
  }, [gAnime, gLangMan, gChinhKich], [
    { person_id: people['Makoto Shinkai'].id, credit_type: CreditType.crew, character: 'Director' }
  ]);

  // Phim Việt Nam
  const m_bogia = await createMovie({
    title: 'Bố Già', original_title: 'Bố Già', slug: 'bo-gia', tmdb_id: 791461,
    description: 'Câu chuyện về cuộc sống mưu sinh của ông Sang làm nghề chở hàng thuê và đứa con trai Quắn.',
    release_date: new Date('2021-03-05'), country_id: cVN, media_type: MediaType.MOVIE,
    poster_url: 'https://image.tmdb.org/t/p/original/WoFe2UXDzLAZAk6aFxcOkBXyfT.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/ujSsRpowNLeU9tJ3Wed0vorbQMf.jpg',
    metadata: { tmdb_rating: 7.5, local: true, duration: '2h 8m' }
  }, [gChinhKich, gHai, gGiaDinh], [
    { person_id: people['Trấn Thành'].id, credit_type: CreditType.cast, character: 'Ba Sang', ordering: 1 },
  ]);

  // ================= PHIM BỘ (TV SERIES) =================
  console.log('Dang tao mot vai TV Series...');
    
  const breakingBad = await prisma.movie.create({
    data: {
        title: 'Biến Chất', original_title: 'Breaking Bad', slug: 'breaking-bad', tmdb_id: 1396, // ID giả định
        description: 'Một giáo viên hóa học bị ung thư chuyển sang sản xuất ma túy đá.',
        release_date: new Date('2008-01-20'), country_id: cUS, media_type: MediaType.TV,
        poster_url: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
        backdrop_url: 'https://image.tmdb.org/t/p/original/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
        metadata: { tmdb_rating: 9.3, total_seasons: 5 },
        // Thêm genres và credits thủ công vì không dùng helper
        movie_genres: { create: [{ genre_id: gHinhSu! }, { genre_id: gGayCan! }, { genre_id: gChinhKich! }] },
        movie_people: { create: [{ person_id: people['Bryan Cranston'].id, credit_type: CreditType.cast, character: 'Walter White' }] }
    }
  });
  movies.push(breakingBad);

  const bbS1 = await prisma.season.create({ data: { movie_id: breakingBad.id, season_number: 1, title: 'Mùa 1' } });
  await prisma.episode.createMany({
    data: [
      { season_id: bbS1.id, episode_number: 1, title: 'Pilot', runtime: 58, video_url: 'https://www.youtube.com/embed/HhesaQXLuRY' },
      { season_id: bbS1.id, episode_number: 2, title: 'Cat\'s in the Bag...', runtime: 48, video_url: 'https://www.youtube.com/embed/HhesaQXLuRY' }
    ]
  });

  const squidGame = await prisma.movie.create({
    data: {
        title: 'Trò Chơi Con Mực', original_title: 'Squid Game', slug: 'squid-game', tmdb_id: 93405, // ID giả định
        description: 'Hàng trăm người chơi kẹt tiền chấp nhận một lời mời kỳ lạ thi đấu.',
        release_date: new Date('2021-09-17'), country_id: cKR, media_type: MediaType.TV,
        poster_url: 'https://image.tmdb.org/t/p/w500/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg',
        backdrop_url: 'https://image.tmdb.org/t/p/original/tffgP6vI3T2YqV0yNnC9u18l98e.jpg',
        metadata: { tmdb_rating: 8.4, total_seasons: 1 },
        // Thêm genres và credits thủ công vì không dùng helper
        movie_genres: { create: [{ genre_id: gHanhDong! }, { genre_id: gGayCan! }, { genre_id: gBiAn! }] },
        movie_people: { create: [{ person_id: people['Lee Jung-jae'].id, credit_type: CreditType.cast, character: 'Seong Gi-hun' }] }
    }
  });
  movies.push(squidGame);

  const sgS1 = await prisma.season.create({ data: { movie_id: squidGame.id, season_number: 1, title: 'Mùa 1' } });
  await prisma.episode.create({
    data: { season_id: sgS1.id, episode_number: 1, title: 'Đèn đỏ, Đèn xanh', runtime: 60, video_url: 'https://www.youtube.com/embed/oqxAJKy0ii4' }
  });

  // ================= DỮ LIỆU LIÊN QUAN =================
  console.log('Dang tao du lieu lien quan (Ratings, Comments, Playlist)...');
  
  // Ratings (từ seed2)
  await prisma.rating.createMany({
    data: [
      { user_id: adminUser.id, movie_id: m_inception.id, rating: 9 },
      { user_id: normalUser.id, movie_id: m_parasite.id, rating: 10 },
      { user_id: adminUser.id, movie_id: breakingBad.id, rating: 9 },
    ],
  });

  // Comments (từ seed2)
  const comment1 = await prisma.comment.create({
    data: {
      user_id: normalUser.id,
      movie_id: m_inception.id,
      comment: 'Phim xoắn não nhưng rất hay!',
    },
  });
  await prisma.comment.create({
    data: {
      user_id: adminUser.id,
      movie_id: m_inception.id,
      comment: 'Chuẩn, xem lần 2 còn đã hơn!',
      parent_comment_id: comment1.id,
    },
  });

  // Favourites & Playlist (từ seed2)
  await prisma.favourite.createMany({
    data: [
      { user_id: normalUser.id, movie_id: m_inception.id },
      { user_id: normalUser.id, movie_id: m_parasite.id },
      { user_id: normalUser.id, movie_id: breakingBad.id },
    ],
  });

  const playlist = await prisma.playlist.create({
    data: {
      user_id: normalUser.id,
      name: 'My Favourite Movies',
      description: 'Danh sách phim yêu thích nhất.',
    },
  });
  await prisma.playlistMovie.createMany({
    data: [
      { playlist_id: playlist.id, movie_id: m_inception.id },
      { playlist_id: playlist.id, movie_id: m_parasite.id },
      { playlist_id: playlist.id, movie_id: breakingBad.id },
    ],
  });


  // ================= HOMEPAGE DATA =================
  console.log('Dang tao du lieu Trang chu...');
  await prisma.banner.createMany({
    data: [
      { title: 'Interstellar', image_url: m_interstellar.backdrop_url, link_url: `/movie/${m_interstellar.slug}`, is_active: true },
      { title: 'Breaking Bad', image_url: breakingBad.backdrop_url, link_url: `/movie/${breakingBad.slug}`, is_active: true },
      { title: 'John Wick', image_url: m_johnwick.backdrop_url, link_url: `/movie/${m_johnwick.slug}`, is_active: true },
      { title: 'Avengers: Endgame', image_url: m_endgame.backdrop_url, link_url: `/movie/${m_endgame.slug}`, is_active: true },
    ]
  });

  const sections = [
    { title: 'Phim Thịnh Hành', movies: [m_interstellar, m_johnwick, m_parasite, m_yourname, m_inception, m_endgame] },
    { title: 'Phim Bộ Nổi Bật', movies: [breakingBad, squidGame] },
    { title: 'Phim Việt Nam Hot', movies: [m_bogia] },
    { title: 'Hành Động & Bom Tấn', movies: [m_inception, m_johnwick, m_endgame] },
  ];

  for (let i = 0; i < sections.length; i++) {
    const section = await prisma.homepageSection.create({ data: { title: sections[i].title, display_order: i + 1, is_visible: true } });
    // Lọc những phim đã được tạo thành công
    const validMovies = sections[i].movies.filter(m => m !== undefined && m !== null);

    await prisma.sectionMovieLink.createMany({
      data: validMovies.map((m, idx) => ({ section_id: section.id, movie_id: m.id, display_order: idx + 1 }))
    });
  }

  console.log('Seed du lieu hoan tat!');
}

main()
  .catch((e) => {
    console.error('Loi seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
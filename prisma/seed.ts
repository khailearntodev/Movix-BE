import { PrismaClient, CreditType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const GENRES = [
  'Hành Động', 'Phiêu Lưu', 'Hoạt Hình', 'Hài', 'Hình Sự', 'Tài Liệu', 'Chính Kịch',
  'Gia Đình', 'Giả Tưởng', 'Lịch Sử', 'Kinh Dị', 'Nhạc', 'Bí Ẩn', 'Lãng Mạn',
  'Khoa Học Viễn Tưởng', 'Phim Truyền Hình', 'Gay Cấn', 'Chiến Tranh', 'Miền Tây', 'Anime', 'Tâm Lý'
];

const COUNTRIES = [
  'Mỹ', 'Anh', 'Hàn Quốc', 'Nhật Bản', 'Trung Quốc', 'Việt Nam', 
  'Pháp', 'Đức', 'Thái Lan', 'Ấn Độ', 'Tây Ban Nha'
];

async function main() {
  console.log('Bat dau qua trinh seed du lieu...');

  // 1. Xóa dữ liệu cũ
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

  await prisma.user.create({
    data: {
      username: 'admin', password: hashedPassword, email: 'admin@movix.com',
      display_name: 'Admin', role_id: adminRole.id, status: 'active',
      avatar_url: 'https://github.com/shadcn.png',
    },
  });

  await prisma.user.create({
    data: {
      username: 'user1', password: hashedPassword, email: 'user1@movix.com',
      display_name: 'Khải Dev', role_id: userRole.id, status: 'active',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    },
  });

  // 3. Tạo Countries & Genres
  console.log('Dang tao Quoc gia va The loai...');
  await prisma.country.createMany({ data: COUNTRIES.map(name => ({ name })) });
  await prisma.genre.createMany({ data: GENRES.map(name => ({ name })) });

  // Helper để lấy ID
  const getCountry = async (name: string) => (await prisma.country.findFirst({ where: { name } }))?.id;
  const getGenre = async (name: string) => (await prisma.genre.findUnique({ where: { name } }))?.id;

  const [cUS, cKR, cVN, cJP] = await Promise.all([
    getCountry('Mỹ'), getCountry('Hàn Quốc'), getCountry('Việt Nam'), getCountry('Nhật Bản')
  ]);
  const [gHanhDong, gKHOAHOC, gPhieuLuu, gHai, gKinhDi, gLangMan, gHoatHinh, gAnime, gChinhKich, gGayCan, gTamLy, gGiaDinh, gNhac, gHinhSu, gBiAn, gGiaTuong] = await Promise.all([
    getGenre('Hành Động'), getGenre('Khoa Học Viễn Tưởng'), getGenre('Phiêu Lưu'), getGenre('Hài'), getGenre('Kinh Dị'),
    getGenre('Lãng Mạn'), getGenre('Hoạt Hình'), getGenre('Anime'), getGenre('Chính Kịch'), getGenre('Gay Cấn'),
    getGenre('Tâm Lý'), getGenre('Gia Đình'), getGenre('Nhạc'), getGenre('Hình Sự'), getGenre('Bí Ẩn'), getGenre('Giả Tưởng')
  ]);

  // 4. Tạo Persons (Đã thêm nhiều diễn viên hơn)
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
  const movies = [];

  // Helper tạo phim nhanh
  const createMovie = async (data: any, genres: any[], casts: any[] = []) => {
    const validGenres = genres.filter(g => g !== undefined && g !== null);
    const movie = await prisma.movie.create({
      data: {
        ...data,
        movie_genres: { create: validGenres.map(id => ({ genre_id: id })) },
        movie_people: { create: casts }
      }
    });
    movies.push(movie);
    return movie;
  };

  const m_inception = await createMovie({
    title: 'Kẻ Đánh Cắp Giấc Mơ', original_title: 'Inception', slug: 'inception',
    description: 'Một kẻ cắp chuyên nghiệp đánh cắp thông tin bằng cách xâm nhập vào tiềm thức của mục tiêu.',
    release_date: new Date('2010-07-16'), country_id: cUS,
    poster_url: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/ztZ4vw151mw04Bg6rqJLQGBAmvn.jpg',
    trailer_url: 'https://vip.opstream11.com/20220314/1901_ef246108/index.m3u8',
    metadata: { tmdb_rating: 8.8, duration: '2h 28m' } // 148m
  }, [gKHOAHOC, gHanhDong, gPhieuLuu], [
    { person_id: people['Christopher Nolan'].id, credit_type: CreditType.crew, character: 'Director' },
    { person_id: people['Leonardo DiCaprio'].id, credit_type: CreditType.cast, character: 'Dom Cobb', ordering: 1 },
    { person_id: people['Tom Hardy'].id, credit_type: CreditType.cast, character: 'Eames', ordering: 2 },
    { person_id: people['Cillian Murphy'].id, credit_type: CreditType.cast, character: 'Robert Fischer', ordering: 3 }
  ]);

  const m_interstellar = await createMovie({
    title: 'Hố Đen Tử Thần', original_title: 'Interstellar', slug: 'interstellar',
    description: 'Một nhóm nhà thám hiểm sử dụng lỗ sâu mới được phát hiện để vượt qua các giới hạn của việc du hành không gian nhằm tìm kiếm một ngôi nhà mới cho nhân loại.',
    release_date: new Date('2014-11-07'), country_id: cUS,
    poster_url: 'https://image.tmdb.org/t/p/original/if4TI9LbqNIrzkoOgWjX5PZYDYe.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/ln2Gre4IYRhpjuGVybbtaF4CLo5.jpg',
    metadata: { tmdb_rating: 8.6, duration: '2h 49m' } // 169m
  }, [gKHOAHOC, gPhieuLuu, gChinhKich], [
    { person_id: people['Christopher Nolan'].id, credit_type: CreditType.crew, character: 'Director' },
    { person_id: people['Matthew McConaughey'].id, credit_type: CreditType.cast, character: 'Cooper', ordering: 1 },
    { person_id: people['Anne Hathaway'].id, credit_type: CreditType.cast, character: 'Brand', ordering: 2 },
    { person_id: people['Jessica Chastain'].id, credit_type: CreditType.cast, character: 'Murph', ordering: 3 }
  ]);

  const m_endgame = await createMovie({
    title: 'Avengers: Hồi Kết', original_title: 'Avengers: Endgame', slug: 'avengers-endgame',
    description: 'Sau sự kiện tàn khốc của "Infinity War", vũ trụ điêu tàn. Avengers tập hợp một lần nữa để đảo ngược hành động của Thanos.',
    release_date: new Date('2019-04-26'), country_id: cUS,
    poster_url: 'https://image.tmdb.org/t/p/original/8go3YE9sBMQaCXEx23j6BAfeuxd.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg',
    trailer_url: 'https://vip.opstream14.com/20220509/11208_25f9635f/index.m3u8',
    metadata: { tmdb_rating: 8.3, duration: '3h 1m' } // 181m
  }, [gHanhDong, gPhieuLuu, gKHOAHOC], [
    { person_id: people['Robert Downey Jr.'].id, credit_type: CreditType.cast, character: 'Tony Stark / Iron Man', ordering: 1 },
    { person_id: people['Chris Evans'].id, credit_type: CreditType.cast, character: 'Steve Rogers / Captain America', ordering: 2 },
    { person_id: people['Chris Hemsworth'].id, credit_type: CreditType.cast, character: 'Thor', ordering: 3 },
    { person_id: people['Mark Ruffalo'].id, credit_type: CreditType.cast, character: 'Bruce Banner / Hulk', ordering: 4 },
    { person_id: people['Scarlett Johansson'].id, credit_type: CreditType.cast, character: 'Natasha Romanoff / Black Widow', ordering: 5 }
  ]);

  const m_johnwick = await createMovie({
    title: 'Sát Thủ John Wick', original_title: 'John Wick', slug: 'john-wick',
    description: 'Một cựu sát thủ tái xuất giang hồ để trả thù những kẻ đã giết chú chó của mình, món quà cuối cùng từ người vợ quá cố.',
    release_date: new Date('2014-10-24'), country_id: cUS,
    poster_url: 'https://image.tmdb.org/t/p/original/8CYSvYTw9tbFynivdcBcoqRWPGM.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/vL5LR6WdxWPjLPFRLe133jXWsh5.jpg',
    trailer_url: 'https://vip.opstream11.com/20220314/1901_ef246108/index.m3u8',
    metadata: { tmdb_rating: 7.4, duration: '1h 41m' } // 101m
  }, [gHanhDong, gGayCan, gHinhSu], [
    { person_id: people['Keanu Reeves'].id, credit_type: CreditType.cast, character: 'John Wick', ordering: 1 }
  ]);

  const m_lalaland = await createMovie({
    title: 'Những Kẻ Khờ Mộng Mơ', original_title: 'La La Land', slug: 'la-la-land',
    description: 'Tại Los Angeles, một nữ diễn viên đầy tham vọng và một nhạc sĩ jazz yêu nhau, nhưng phải đối mặt với những khó khăn khi theo đuổi ước mơ của mình.',
    release_date: new Date('2016-12-09'), country_id: cUS,
    poster_url: 'https://image.tmdb.org/t/p/original/gN1VfkONPYb7frEKfpCFTHRMxj3.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/qJeU7KM4nR2C1TuUmnkpLMU7mh.jpg',
    metadata: { tmdb_rating: 7.9, duration: '2h 8m' } // 128m
  }, [gLangMan, gChinhKich, gNhac], [
    { person_id: people['Emma Stone'].id, credit_type: CreditType.cast, character: 'Mia', ordering: 1 },
    { person_id: people['Ryan Gosling'].id, credit_type: CreditType.cast, character: 'Sebastian', ordering: 2 }
  ]);

  const m_spiderman = await createMovie({
    title: 'Người Nhện: Vũ Trụ Mới', original_title: 'Spider-Man: Into the Spider-Verse', slug: 'spider-man-into-the-spider-verse',
    description: 'Miles Morales trở thành Người Nhện của vũ trụ của mình và phải hợp tác với năm Người Nhện từ các chiều không gian khác để ngăn chặn mối đe dọa cho tất cả các thực tại.',
    release_date: new Date('2018-12-14'), country_id: cUS,
    poster_url: 'https://image.tmdb.org/t/p/w500/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/uUiId6cG32JSRI6RyBGGvU62uMf.jpg',
    metadata: { tmdb_rating: 8.4, duration: '1h 57m' } // 117m
  }, [gHanhDong, gPhieuLuu, gHoatHinh, gKHOAHOC], []);

  const m_parasite = await createMovie({
    title: 'Ký Sinh Trùng', original_title: 'Gisaengchung', slug: 'parasite',
    description: 'Gia đình Ki-taek thất nghiệp, sống bám vào nhau. Họ lần lượt thâm nhập vào gia đình giàu có họ Park.',
    release_date: new Date('2019-05-30'), country_id: cKR,
    poster_url: 'https://image.tmdb.org/t/p/w500/7IiTTgloJU318Uv9B9gW8e8M9g5.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/hiKmpZNUZrfWdLRngjmxLtzUBOD.jpg',
    metadata: { tmdb_rating: 8.5, duration: '2h 12m' } // 132m
  }, [gHai, gGayCan, gChinhKich], [
    { person_id: people['Bong Joon-ho'].id, credit_type: CreditType.crew, character: 'Director' },
    { person_id: people['Song Kang-ho'].id, credit_type: CreditType.cast, character: 'Ki-taek', ordering: 1 },
    { person_id: people['Lee Sun-kyun'].id, credit_type: CreditType.cast, character: 'Dong-ik', ordering: 2 },
    { person_id: people['Cho Yeo-jeong'].id, credit_type: CreditType.cast, character: 'Yeon-kyo', ordering: 3 }
  ]);

  const m_traintobusan = await createMovie({
    title: 'Chuyến Tàu Sinh Tử', original_title: 'Train to Busan', slug: 'train-to-busan',
    description: 'Khi một loại virus zombie bùng phát tại Hàn Quốc, hành khách trên một chuyến tàu từ Seoul đến Busan phải đấu tranh để sinh tồn.',
    release_date: new Date('2016-07-20'), country_id: cKR,
    poster_url: 'https://image.tmdb.org/t/p/original/xMAMpuKpqXI3tfWow59oInjfoPA.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/aKISIT8ir0UhHD4yRHDzpK4b6yS.jpg',
    metadata: { tmdb_rating: 7.8, duration: '1h 58m' } // 118m
  }, [gHanhDong, gKinhDi, gGayCan], [
    { person_id: people['Gong Yoo'].id, credit_type: CreditType.cast, character: 'Seok-woo', ordering: 1 },
    { person_id: people['Ma Dong-seok'].id, credit_type: CreditType.cast, character: 'Sang-hwa', ordering: 2 }
  ]);

  const m_yourname = await createMovie({
    title: 'Tên Cậu Là Gì?', original_title: 'Kimi no Na wa.', slug: 'your-name',
    description: 'Hai người lạ thấy mình được liên kết với nhau theo một cách kỳ lạ qua những giấc mơ.',
    release_date: new Date('2016-08-26'), country_id: cJP,
    poster_url: 'https://image.tmdb.org/t/p/w500/q719jXXEzOoYaps6babgKnONONX.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/dIWwZW7dJJtqC6CgWzhYkypQDrm.jpg',
    metadata: { tmdb_rating: 8.6, duration: '1h 46m' } // 106m
  }, [gAnime, gLangMan, gChinhKich], [
    { person_id: people['Makoto Shinkai'].id, credit_type: CreditType.crew, character: 'Director' }
  ]);

  const m_spiritedaway = await createMovie({
    title: 'Vùng Đất Linh Hồn', original_title: 'Spirited Away', slug: 'spirited-away',
    description: 'Chihiro, một cô bé 10 tuổi, bị lạc vào thế giới của các linh hồn và phải làm việc để giải cứu cha mẹ mình.',
    release_date: new Date('2001-07-20'), country_id: cJP,
    poster_url: 'https://image.tmdb.org/t/p/original/8go3YE9sBMQaCXEx23j6BAfeuxd.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/bSXfU4dwZyBA1vMmXvejdRXBvuF.jpg',
    metadata: { tmdb_rating: 8.5, duration: '2h 5m' } // 125m
  }, [gAnime, gPhieuLuu, gGiaDinh, gGiaTuong], [
    { person_id: people['Hayao Miyazaki'].id, credit_type: CreditType.crew, character: 'Director' }
  ]);

  const m_bogia = await createMovie({
    title: 'Bố Già', original_title: 'Bố Già', slug: 'bo-gia',
    description: 'Câu chuyện về cuộc sống mưu sinh của ông Sang làm nghề chở hàng thuê và đứa con trai Quắn.',
    release_date: new Date('2021-03-05'), country_id: cVN,
    poster_url: 'https://image.tmdb.org/t/p/original/WoFe2UXDzLAZAk6aFxcOkBXyfT.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/ujSsRpowNLeU9tJ3Wed0vorbQMf.jpg',
    metadata: { tmdb_rating: 7.5, local: true, duration: '2h 8m' } // 128m
  }, [gChinhKich, gHai, gGiaDinh], [
    { person_id: people['Trấn Thành'].id, credit_type: CreditType.cast, character: 'Ba Sang', ordering: 1 },
    { person_id: people['Tuấn Trần'].id, credit_type: CreditType.cast, character: 'Quắn', ordering: 2 }
  ]);

  const m_mai = await createMovie({
    title: 'Mai', original_title: 'Mai', slug: 'mai',
    description: 'Mai, một người phụ nữ gần 40 tuổi, tình cờ gặp nhạc công Dương và được anh săn đón. Tự ti về quá khứ, Mai không đủ dũng khí đón nhận tình cảm của Dương.',
    release_date: new Date('2024-02-10'), country_id: cVN,
    poster_url: 'https://image.tmdb.org/t/p/original/n764Alj5Uf1uMtnEpN3OkVyLob5.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/zZ6nRdNQNxRnZ1LQ2ttPBZl9AXV.jpg',
    metadata: { tmdb_rating: 7.8, local: true, duration: '2h 11m' } // 131m
  }, [gLangMan, gTamLy, gChinhKich], [
    { person_id: people['Trấn Thành'].id, credit_type: CreditType.crew, character: 'Director' },
    { person_id: people['Phương Anh Đào'].id, credit_type: CreditType.cast, character: 'Mai', ordering: 1 },
    { person_id: people['Tuấn Trần'].id, credit_type: CreditType.cast, character: 'Dương', ordering: 2 }
  ]);

  const m_matbiec = await createMovie({
    title: 'Mắt Biếc', original_title: 'Mắt Biếc', slug: 'mat-biec',
    description: 'Mối tình đơn phương của Ngạn dành cho Hà Lan, cô bạn gái có đôi mắt tuyệt đẹp nhưng lại bướng bỉnh.',
    release_date: new Date('2019-12-20'), country_id: cVN,
    poster_url: 'https://image.tmdb.org/t/p/original/mCB5zkwMdDoygHV4Lklps74K3dK.jpg',
    metadata: { tmdb_rating: 8.0, local: true, duration: '1h 57m' } // 117m
  }, [gLangMan, gChinhKich], [
    { person_id: people['Victor Vũ'].id, credit_type: CreditType.crew, character: 'Director' },
    { person_id: people['Trần Nghĩa'].id, credit_type: CreditType.cast, character: 'Ngạn', ordering: 1 },
    { person_id: people['Trúc Anh'].id, credit_type: CreditType.cast, character: 'Hà Lan', ordering: 2 }
  ]);

  console.log('Dang tao mot vai TV Series...');
   
  const breakingBad = await createMovie({
    title: 'Biến Chất', original_title: 'Breaking Bad', slug: 'breaking-bad',
    description: 'Một giáo viên hóa học bị ung thư chuyển sang sản xuất ma túy đá.',
    release_date: new Date('2008-01-20'), country_id: cUS,
    poster_url: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
    backdrop_url: 'https://image.tmdb.org/t/p/original/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
    metadata: { tmdb_rating: 9.3, is_series: true, total_seasons: 5 }
  }, [gHinhSu, gGayCan, gChinhKich], [
    { person_id: people['Bryan Cranston'].id, credit_type: CreditType.cast, character: 'Walter White' }
  ]);

  const bbS1 = await prisma.season.create({ data: { movie_id: breakingBad.id, season_number: 1, title: 'Mùa 1' } });
  await prisma.episode.createMany({
    data: [
      { season_id: bbS1.id, episode_number: 1, title: 'Pilot', runtime: 58, video_url: 'https://www.youtube.com/embed/HhesaQXLuRY' },
      { season_id: bbS1.id, episode_number: 2, title: 'Cat\'s in the Bag...', runtime: 48, video_url: 'https://www.youtube.com/embed/HhesaQXLuRY' }
    ]
  });

  const squidGame = await createMovie({
    title: 'Trò Chơi Con Mực', original_title: 'Squid Game', slug: 'squid-game',
    description: 'Hàng trăm người chơi kẹt tiền chấp nhận một lời mời kỳ lạ thi đấu trong các trò chơi trẻ con để giành giải thưởng hấp dẫn.',
    release_date: new Date('2021-09-17'), country_id: cKR,
    poster_url: 'https://image.tmdb.org/t/p/w500/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg',
    metadata: { tmdb_rating: 8.4, is_series: true, total_seasons: 1 }
  }, [gHanhDong, gGayCan, gBiAn], [
    { person_id: people['Lee Jung-jae'].id, credit_type: CreditType.cast, character: 'Seong Gi-hun' },
    { person_id: people['Gong Yoo'].id, credit_type: CreditType.cast, character: 'Salesman', ordering: 2 }
  ]);

  const sgS1 = await prisma.season.create({ data: { movie_id: squidGame.id, season_number: 1, title: 'Mùa 1' } });
  await prisma.episode.create({
    data: { season_id: sgS1.id, episode_number: 1, title: 'Đèn đỏ, Đèn xanh', runtime: 60, video_url: 'https://www.youtube.com/embed/oqxAJKy0ii4' }
  });

  // ================= HOMEPAGE DATA =================
  console.log('Dang tao du lieu Trang chu...');
  await prisma.banner.createMany({
    data: [
      { title: 'Interstellar', image_url: m_interstellar.backdrop_url, link_url: `/movie/${m_interstellar.slug}`, is_active: true },
      { title: 'Spider-Man: Across the Spider-Verse', image_url: m_spiderman.backdrop_url, link_url: `/movie/${m_spiderman.slug}`, is_active: true },
      { title: 'John Wick', image_url: m_johnwick.backdrop_url, link_url: `/movie/${m_johnwick.slug}`, is_active: true },
      { title: 'Avengers: Endgame', image_url: m_endgame.backdrop_url, link_url: `/movie/${m_endgame.slug}`, is_active: true },
    ]
  });

  const sections = [
    { title: 'Phim Thịnh Hành', movies: [m_interstellar, m_johnwick, m_parasite, m_spiderman, m_spiritedaway, m_endgame] },
    { title: 'Phim Việt Nam Hot', movies: [m_bogia, m_matbiec, m_mai] },
    { title: 'Hành Động & Bom Tấn', movies: [m_inception, m_johnwick, m_traintobusan, m_interstellar, m_endgame] },
    { title: 'Hoạt Hình Nổi Bật', movies: [m_yourname, m_spiritedaway, m_spiderman] },
    { title: 'Phim Lãng Mạn', movies: [m_lalaland, m_yourname, m_matbiec, m_mai] },
  ];

  for (let i = 0; i < sections.length; i++) {
    const section = await prisma.homepageSection.create({ data: { title: sections[i].title, display_order: i + 1, is_visible: true } });
    await prisma.sectionMovieLink.createMany({
      data: sections[i].movies.map((m, idx) => ({ section_id: section.id, movie_id: m.id, display_order: idx + 1 }))
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
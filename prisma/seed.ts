import { PrismaClient, MediaType } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

const allGenres = [
  'Anime', 'Bí Ẩn', 'Chiến Tranh', 'Chiếu Rạp', 'Chuyển Thể', 'Chính Kịch', 
  'Chính Luận', 'Chính Trị', 'Chương Trình Truyền Hình', 'Concert Film', 'Cung Đấu', 
  'Cuối Tuần', 'Cách Mạng', 'Cổ Trang', 'Cổ Tích', 'Cổ Điển', 'DC', 'Disney', 
  'Gay Cấn', 'Gia Đình', 'Giáng Sinh', 'Giả Tưởng', 'Hoàng Cung', 'Hoạt Hình', 
  'Hài', 'Hành Động', 'Hình Sự', 'Học Đường', 'Khoa Học', 'Kinh Dị', 'Kinh Điển', 
  'Kịch Nói', 'Kỳ Ảo', 'LGBT+', 'Live Action', 'Lãng Mạn', 'Lịch Sử', 'Marvel', 
  'Miền Viễn Tây', 'Nghề Nghiệp', 'Người Mẫu', 'Nhạc Kịch', 'Phiêu Lưu', 
  'Phép Thuật', 'Siêu Anh Hùng', 'Thiếu Nhi', 'Thần Thoại', 'Thể Thao', 
  'Truyền Hình Thực Tế', 'Tuổi Teen', 'Tội phạm', 'Tâm Lý', 'Tình Cảm', 
  'Tập Luyện', 'Viễn Tưởng', 'Võ Thuật', 'Xuyên Không', 'Đấu Thương', 'Đời Thường', 
  'Ẩm Thực'
];

const allCountries = [
  'Anh', 'Canada', 'Hàn Quốc', 'Hồng Kông', 'Mỹ', 'Nhật Bản', 'Pháp', 
  'Thái Lan', 'Trung Quốc', 'Úc', 'Đài Loan', 'Đức', 'Việt Nam' 
];

async function main() {
  console.log('Clearing old data...');
  await prisma.sectionMovieLink.deleteMany();
  await prisma.homepageSection.deleteMany();
  await prisma.watchPartyMember.deleteMany();
  await prisma.watchParty.deleteMany();
  await prisma.playlistMovie.deleteMany();
  await prisma.playlist.deleteMany();
  await prisma.favourite.deleteMany();
  await prisma.watchHistory.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.rating.deleteMany();
  await prisma.episode.deleteMany();
  await prisma.season.deleteMany();
  await prisma.moviePerson.deleteMany();
  await prisma.person.deleteMany();
  await prisma.movieGenre.deleteMany();
  await prisma.genre.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.chatbotLog.deleteMany();
  await prisma.userFlagLog.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.movie.deleteMany();
  await prisma.country.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  console.log(' Seeding roles...');
  const adminRole = await prisma.role.create({
    data: { name: 'Admin', description: 'System administrator' },
  });
  const userRole = await prisma.role.create({
    data: { name: 'User', description: 'Normal user' },
  });

  console.log('Seeding users...');
  const hashedAdminPassword = await bcrypt.hash('admin123', 10);
  const hashedUserPassword = await bcrypt.hash('user123', 10);
  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      password: hashedAdminPassword, 
      email: 'admin@example.com',
      display_name: 'Admin',
      role_id: adminRole.id,
      status: 'active',
    },
  });
  const normalUser = await prisma.user.create({
    data: {
      username: 'john',
      password: hashedUserPassword,
      email: 'john@example.com',
      display_name: 'John Doe',
      role_id: userRole.id,
      status: 'active',
    },
  });

  console.log('Seeding countries...');
  await prisma.country.createMany({
    data: allCountries.map(name => ({ name })),
    skipDuplicates: true,
  });

  const us = await prisma.country.findFirst({ where: { name: 'Mỹ' } });
  const kr = await prisma.country.findFirst({ where: { name: 'Hàn Quốc' } });
  const vn = await prisma.country.findFirst({ where: { name: 'Việt Nam' } });

  if (!us || !kr || !vn) {
      throw new Error("Không thể tìm thấy các quốc gia cơ bản (Mỹ, Hàn Quốc, Việt Nam) sau khi seed.");
  }

  console.log('Seeding genres...');
  await prisma.genre.createMany({
    data: allGenres.map(name => ({ name })),
    skipDuplicates: true, 
  });

  const hanhDong = await prisma.genre.findUnique({ where: { name: 'Hành Động' } });
  const vienTuong = await prisma.genre.findUnique({ where: { name: 'Viễn Tưởng' } }); // Dùng cho Inception (Sci-Fi)
  const chinhKich = await prisma.genre.findUnique({ where: { name: 'Chính Kịch' } }); // Dùng cho Parasite & Bố Già (Drama)
  const gayCan = await prisma.genre.findUnique({ where: { name: 'Gay Cấn' } }); // Dùng cho Parasite (Thriller)

  if (!hanhDong || !vienTuong || !chinhKich || !gayCan) {
    throw new Error("Không thể tìm thấy các thể loại cơ bản (Hành Động, Viễn Tưởng,...) sau khi seed.");
  }

  console.log('Seeding movies...');
  const inception = await prisma.movie.create({
    data: {
      original_title: 'Inception',
      title: 'Inception',
      slug: 'inception',
      description:
        'A thief who steals corporate secrets through dream-sharing technology.',
      release_date: new Date('2010-07-16'),
      country_id: us.id,
      metadata: { tmdb_rating: 8.8, popularity: 90 },
      media_type: MediaType.MOVIE,
    },
  });
  const parasite = await prisma.movie.create({
    data: {
      original_title: 'Gisaengchung',
      title: 'Parasite',
      slug: 'parasite',
      description:
        'Greed and class discrimination threaten the newly formed symbiotic relationship.',
      release_date: new Date('2019-05-30'),
      country_id: kr.id,
      metadata: { tmdb_rating: 8.6 },
      media_type: MediaType.MOVIE,
    },
  });
  const phimViet = await prisma.movie.create({
    data: {
      original_title: 'Bo Gia',
      title: 'Bố Già',
      slug: 'bo-gia',
      description: 'Phim Việt Nam về gia đình cảm động và hài hước.',
      release_date: new Date('2021-03-05'),
      country_id: vn.id,
      metadata: { local: true },
      media_type: MediaType.TV,
    },
  });

  console.log('Seeding movie genres...');
  await prisma.movieGenre.createMany({
    data: [
      { movie_id: inception.id, genre_id: hanhDong.id },
      { movie_id: inception.id, genre_id: vienTuong.id },
      { movie_id: parasite.id, genre_id: chinhKich.id }, 
      { movie_id: parasite.id, genre_id: gayCan.id }, 
      { movie_id: phimViet.id, genre_id: chinhKich.id },
    ],
  });

  console.log('Seeding persons & credits...');
  const nolan = await prisma.person.create({
    data: { name: 'Christopher Nolan', role_type: 'director' },
  });
  const dicaprio = await prisma.person.create({
    data: { name: 'Leonardo DiCaprio', role_type: 'actor' },
  });
  const songKangHo = await prisma.person.create({
    data: { name: 'Song Kang-ho', role_type: 'actor' },
  });

  await prisma.moviePerson.createMany({
    data: [
      {
        movie_id: inception.id,
        person_id: nolan.id,
        credit_type: 'crew',
        character: 'Director',
      },
      {
        movie_id: inception.id,
        person_id: dicaprio.id,
        credit_type: 'cast',
        character: 'Cobb',
      },
      {
        movie_id: parasite.id,
        person_id: songKangHo.id,
        credit_type: 'cast',
        character: 'Kim Ki-taek',
      },
    ],
  });

  console.log('Seeding ratings, comments...');
  await prisma.rating.createMany({
    data: [
      { user_id: adminUser.id, movie_id: inception.id, rating: 9 },
      { user_id: normalUser.id, movie_id: parasite.id, rating: 10 },
    ],
  });
  const comment1 = await prisma.comment.create({
    data: {
      user_id: normalUser.id,
      movie_id: inception.id,
      comment: 'Phim xoắn não nhưng rất hay!',
    },
  });
  await prisma.comment.create({
    data: {
      user_id: adminUser.id,
      movie_id: inception.id,
      comment: 'Chuẩn, xem lần 2 còn đã hơn!',
      parent_comment_id: comment1.id,
    },
  });

  console.log('Seeding favourites & playlist...');
  await prisma.favourite.createMany({
    data: [
      { user_id: normalUser.id, movie_id: inception.id },
      { user_id: normalUser.id, movie_id: parasite.id },
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
      { playlist_id: playlist.id, movie_id: inception.id },
      { playlist_id: playlist.id, movie_id: parasite.id },
    ],
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
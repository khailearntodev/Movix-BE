import { PrismaClient } from '@prisma/client';
import { generateEmbedding } from '../src/services/ai.service'; 

const prisma = new PrismaClient();

async function run() {
  console.log("🚀 Bắt đầu quá trình tạo vector cho các bộ phim...");
  
  const movies = await prisma.movie.findMany({
    where: { 
      is_deleted: false, 
      is_active: true 
    },
    include: { movie_genres: { include: { genre: true } } }
  });

  console.log(`Tìm thấy ${movies.length} bộ phim cần kiểm tra.`);

  let successCount = 0;

  for (const movie of movies) {
    try {
      // 1. Gộp thông tin phim thành 1 đoạn văn bản giàu ý nghĩa
      const genres = movie.movie_genres.map(g => g.genre.name).join(", ");
      const textToEmbed = `Tên phim: ${movie.title}. Tên gốc: ${movie.original_title}. Thể loại: ${genres}. Mô tả: ${movie.description || "Không có mô tả"}`;

      // 2. Gọi AI tạo Vector
      const embeddingArray = await generateEmbedding(textToEmbed);
      
      // 3. Format mảng thành chuỗi vector: "[0.1, 0.2, ...]"
      const embeddingString = `[${embeddingArray.join(',')}]`;

      // 4. Update vào Database bằng câu lệnh Raw SQL 
      await prisma.$executeRawUnsafe(
        `UPDATE movies SET embedding = $1::vector WHERE id = $2::uuid`,
        embeddingString,
        movie.id
      );

      console.log(`✅ Đã nhúng Vector thành công phim: ${movie.title}`);
      successCount++;
      
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Lỗi khi nhúng phim ${movie.title}:`, error);
    }
  }

  console.log(`🎉 Hoàn tất! Đã xử lý thành công ${successCount} bộ phim.`);
}

// async function run() {
//   console.log("🚀 Lấy danh sách phim CHƯA CÓ vector...");
  
//   // 1. Dùng Raw SQL để lấy chính xác ID của các phim chưa có vector
//   const missingMovies = await prisma.$queryRaw<{id: string}[]>`
//     SELECT id FROM movies 
//     WHERE embedding IS NULL 
//       AND is_deleted = false 
//       AND is_active = true
//   `;

//   const missingIds = missingMovies.map(m => m.id);
//   console.log(`Tìm thấy ${missingIds.length} bộ phim cần xử lý tiếp.`);

//   if (missingIds.length === 0) {
//     console.log("Tất cả phim đều đã có vector. Kết thúc script!");
//     return;
//   }

//   // 2. Dùng Prisma lấy full thông tin (kèm thể loại) dựa trên các ID đó
//   const movies = await prisma.movie.findMany({
//     where: { id: { in: missingIds } },
//     include: { movie_genres: { include: { genre: true } } }
//   });

//   console.log(`Tìm thấy ${movies.length} bộ phim cần kiểm tra.`);

//   let successCount = 0;

//   for (const movie of movies) {
//     try {
//       // 1. Gộp thông tin phim thành 1 đoạn văn bản giàu ý nghĩa
//       const genres = movie.movie_genres.map(g => g.genre.name).join(", ");
//       const textToEmbed = `Tên phim: ${movie.title}. Tên gốc: ${movie.original_title}. Thể loại: ${genres}. Mô tả: ${movie.description || "Không có mô tả"}`;

//       // 2. Gọi AI tạo Vector
//       const embeddingArray = await generateEmbedding(textToEmbed);
      
//       // 3. Format mảng thành chuỗi vector: "[0.1, 0.2, ...]"
//       const embeddingString = `[${embeddingArray.join(',')}]`;

//       // 4. Update vào Database bằng câu lệnh Raw SQL 
//       await prisma.$executeRawUnsafe(
//         `UPDATE movies SET embedding = $1::vector WHERE id = $2::uuid`,
//         embeddingString,
//         movie.id
//       );

//       console.log(`✅ Đã nhúng Vector thành công phim: ${movie.title}`);
//       successCount++;
      
//       await new Promise(resolve => setTimeout(resolve, 1000));

//     } catch (error) {
//       console.error(`❌ Lỗi khi nhúng phim ${movie.title}:`, error);
//     }
//   }

//   console.log(`🎉 Hoàn tất! Đã xử lý thành công ${successCount} bộ phim.`);
// }

run()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
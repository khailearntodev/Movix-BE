import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../lib/prisma";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function generateContentSafe(prompt: string) {
  const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];
  
  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error: any) {
      if (error.message?.includes("404") || error.status === 404 || error.status === 400) {
        console.warn(`Model ${modelName} không khả dụng, đang thử model tiếp theo...`);
        continue;
      }
      throw error;
    }
  }
  throw new Error("Tất cả các model AI đều không phản hồi.");
}

export const chatWithAI = async (userMessage: string, userId?: string) => {
  // 1. Lấy dữ liệu phim
  const availableMovies = await prisma.movie.findMany({
    where: { is_deleted: false, is_active: true },
    take: 100,
    orderBy: { created_at: 'desc' },
    select: {
      title: true,
      movie_genres: { select: { genre: { select: { name: true } } } },
      release_date: true,
    }
  });

  // 2. Tạo Context
  const moviesContext = availableMovies.map(m => {
    const genres = m.movie_genres.map(mg => mg.genre.name).join(", ");
    const year = m.release_date ? new Date(m.release_date).getFullYear() : "N/A";
    return `- ${m.title} (${year}) [${genres}]`;
  }).join("\n");

  const prompt = `
    Bạn là trợ lý ảo của Movix. Dưới đây là phim mới:
    ${moviesContext}
    
    User hỏi: "${userMessage}"
    
    Trả lời ngắn gọn tiếng Việt. Ưu tiên gợi ý phim trong list trên.
  `;

  let logId = null;
  if (userId) {
    try {
      const userExists = await prisma.user.findUnique({ where: { id: userId } });
      if (userExists) {
        const log = await prisma.chatbotLog.create({
          data: { user_id: userId, user_message: userMessage },
        });
        logId = log.id;
      }
    } catch (e) { console.warn("Lỗi log chat:", e); }
  }

  try {
    const response = await generateContentSafe(prompt);

    if (logId) {
       await prisma.chatbotLog.update({
         where: { id: logId },
         data: { bot_response: response }
       }).catch(() => {});
    }
    return response;

  } catch (error: any) {
    console.error("AI Service Error:", error.message);
    
    if (error.message?.includes("429") || error.status === 429) {
      return "Hệ thống đang bận (hết lượt miễn phí). Vui lòng thử lại sau 1 phút.";
    }
    
    return "Xin lỗi, tôi đang gặp sự cố kết nối với AI server.";
  }
};

export const searchMoviesByAI = async (query: string) => {
  const movies = await prisma.movie.findMany({
    where: { is_deleted: false, is_active: true },
    select: {
      id: true,
      title: true,
      description: true,
      movie_genres: { select: { genre: { select: { name: true } } } }
    }
  });

  const moviesContext = movies.map(m => 
    `ID:${m.id}|Tên:${m.title}|Nội dung:${m.description}|TL:${m.movie_genres.map(g => g.genre.name).join(",")}`
  ).join("\n");

  const prompt = `
    Dữ liệu: ${moviesContext}
    Tìm phim theo mô tả: "${query}".
    CHỈ TRẢ VỀ JSON Mảng ID: ["id1", "id2"]. Không giải thích.
  `;

  try {
    const textResponse = await generateContentSafe(prompt);
    const cleanedText = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
    const movieIds = JSON.parse(cleanedText);

    if (!Array.isArray(movieIds) || movieIds.length === 0) return [];

    return await prisma.movie.findMany({
      where: { id: { in: movieIds } },
      include: { movie_genres: { include: { genre: true } } }
    });

  } catch (error) {
    console.error("AI Search Error:", error);
    return [];
  }
};
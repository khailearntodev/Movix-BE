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

function fileToGenerativePart(buffer: Buffer, mimeType: string) {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType,
    },
  };
}

export const chatWithAI = async (userMessage: string, userId?: string, isRaw: boolean = false) => {

  if (isRaw) {
      try {
          const response = await generateContentSafe(userMessage);
          return response;
      } catch (error: any) {
          console.error("AI Raw Error:", error);
          return "Lỗi khi hỏi AI.";
      }
  }
  // 1. Lấy dữ liệu phim
  const availableMovies = await prisma.movie.findMany({
    where: { is_deleted: false, is_active: true },
    take: 200,
    orderBy: { created_at: 'desc' },
    select: {
      title: true,
      slug: true,
      movie_genres: { select: { genre: { select: { name: true } } } },
      release_date: true,
    }
  });

  // 2. Tạo Context
  const moviesContext = availableMovies.map(m => {
    const genres = m.movie_genres.map(mg => mg.genre.name).join(", ");
    const year = m.release_date ? new Date(m.release_date).getFullYear() : "N/A";
    return `Phim: "${m.title}" (Năm: ${year}, Slug: ${m.slug}) - Thể loại: ${genres}`;
  }).join("\n");

  const prompt = `
    Bạn là trợ lý ảo của Movix. Dưới đây là danh sách phim có trong hệ thống:
    ${moviesContext}
    
    Câu hỏi của user: "${userMessage}"
    
    Yêu cầu:
    - Trả lời ngắn gọn, thân thiện bằng tiếng Việt.
    - QUAN TRỌNG: Khi nhắc đến tên phim có trong danh sách, HÃY ĐỊNH DẠNG NÓ NHƯ SAU: [Tên phim](/movies/slug-cua-phim).
    - Ví dụ: Nếu gợi ý phim Mai có slug là 'mai-2024', hãy viết là: Bạn có thể xem [Mai](/movies/mai-2024) nhé.
    - Chỉ gợi ý phim có trong danh sách trên.
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

export const searchMoviesByVoice = async (audioBuffer: Buffer, mimeType: string) => {
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

  const promptText = `
    Dưới đây là danh sách phim trong cơ sở dữ liệu:
    ${moviesContext}

    Hãy nghe đoạn ghi âm của người dùng (có thể là tên phim hoặc mô tả nội dung).
    Hãy tìm các phim trong danh sách trên phù hợp nhất với lời nói đó.
    CHỈ TRẢ VỀ JSON Mảng ID: ["id1", "id2"]. 
    Nếu không tìm thấy, trả về []. Không giải thích thêm.
  `;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); 

    const imagePart = fileToGenerativePart(audioBuffer, mimeType);
    const result = await model.generateContent([promptText, imagePart]);
    const responseText = result.response.text();

    const cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    const movieIds = JSON.parse(cleanedText);

    if (!Array.isArray(movieIds) || movieIds.length === 0) return [];

    return await prisma.movie.findMany({
      where: { id: { in: movieIds } },
      include: { movie_genres: { include: { genre: true } } }
    });

  } catch (error) {
    console.error("AI Voice Search Error:", error);
    return [];
  }
};
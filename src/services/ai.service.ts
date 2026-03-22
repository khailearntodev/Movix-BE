import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../lib/prisma";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function generateContentSafe(prompt: string, maxRetries = 2) {
  const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];

  for (const modelName of modelsToTry) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { maxOutputTokens: 2048 } });
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (error: any) {
        if (error.message?.includes("404") || error.status === 404 || error.status === 400) {
          console.warn(`Model ${modelName} không khả dụng, đang thử model tiếp theo...`);
          break;
        }

        if (error.status === 429 || error.message?.includes("429")) {
          const retryMatch = error.message?.match(/retry in ([\d.]+)s/i)
            || error.errorDetails?.find((d: any) => d.retryDelay)?.retryDelay?.match(/(\d+)/);
          const waitSec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) + 2 : 20;

          if (attempt < maxRetries) {
            console.warn(`Rate limited (429). Retry ${attempt + 1}/${maxRetries} sau ${waitSec}s...`);
            await sleep(waitSec * 1000);
            continue;
          }
        }

        throw error;
      }
    }
  }
  throw new Error("Tất cả các model AI đều không phản hồi.");
}

function safeParseJsonIds(text: string): string[] {
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed.map(String);
    return [];
  } catch {
    const matches = cleaned.match(/"([a-f0-9-]{36})"/g);
    if (matches && matches.length > 0) {
      return matches.map(m => m.replace(/"/g, ""));
    }
    return [];
  }
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
      release_date: true,
      movie_genres: { select: { genre: { select: { name: true } } } }
    }
  });

  const moviesContext = movies.map((m, i) => {
    const desc = m.description ? m.description.substring(0, 120) : "";
    const year = m.release_date ? new Date(m.release_date).getFullYear() : "";
    const genres = m.movie_genres.map(g => g.genre.name).join(",");
    return `${i}|${m.title}|${year}|${genres}|${desc}`;
  }).join("\n");

  const prompt = `Bạn là chuyên gia phim ảnh. Dưới đây là danh sách phim (Index|Tên|Năm|Thể loại|Mô tả):
${moviesContext}

Người dùng mô tả: "${query}"

Hãy phân tích ngữ nghĩa mô tả trên và tìm các phim PHÙ HỢP NHẤT dựa trên:
- Nội dung/cốt truyện tương đồng
- Thể loại phù hợp
- Bối cảnh, nhân vật, cảm xúc được mô tả
- Từ khóa liên quan

CHỈ trả về JSON mảng số index, sắp xếp theo độ phù hợp giảm dần, tối đa 10: [0,5,12]
Không giải thích.`;

  try {
    const textResponse = await generateContentSafe(prompt);
    const cleaned = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();

    let indices: number[] = [];
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) indices = parsed.map(Number).filter(n => !isNaN(n));
    } catch {
      const matches = cleaned.match(/\d+/g);
      if (matches) indices = matches.map(Number).filter(n => !isNaN(n));
    }

    const validIds = indices
      .filter(i => i >= 0 && i < movies.length)
      .map(i => movies[i].id);

    if (validIds.length === 0) return [];

    const found = await prisma.movie.findMany({
      where: { id: { in: validIds } },
      include: { movie_genres: { include: { genre: true } } }
    });

    return validIds
      .map(id => found.find(m => m.id === id))
      .filter(Boolean);

  } catch (error: any) {
    console.error("AI Search Error:", error.message || error);
    if (error.message?.includes("429") || error.status === 429) {
        console.warn("AI Quota exceeded, returning empty list.");
    }
    return [];
  }
};

export const searchMoviesByVoice = async (audioBuffer: Buffer, mimeType: string) => {
  const movies = await prisma.movie.findMany({
    where: { is_deleted: false, is_active: true },
    take: 100,
    select: {
      id: true,
      title: true,
      movie_genres: { select: { genre: { select: { name: true } } } }
    }
  });

  const moviesContext = movies.map(m => {
    return `${m.id}|${m.title}|${m.movie_genres.map(g => g.genre.name).join(",")}`;
  }).join("\n");

  const promptText = `Dữ liệu phim (ID|Tên|Thể loại):
${moviesContext}

Hãy nghe đoạn ghi âm và tìm phim phù hợp.
CHỈ trả về JSON:
{"recognizedText":"Lời nói","movieIds":["id1","id2"]}
Không giải thích.`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 

    const imagePart = fileToGenerativePart(audioBuffer, mimeType);
    const result = await model.generateContent([promptText, imagePart]);
    const responseText = result.response.text();

    const cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    let parsedResult;
    try {
        parsedResult = JSON.parse(cleanedText);
    } catch (e) {
        console.warn("AI Voice JSON parse error, raw text:", cleanedText);
        return { movies: [], recognizedText: "Không thể nhận dạng" };
    }

    const { movieIds, recognizedText } = parsedResult;

    if (!Array.isArray(movieIds) || movieIds.length === 0) {
        return { movies: [], recognizedText: recognizedText || "" };
    }

    const foundMovies = await prisma.movie.findMany({
      where: { id: { in: movieIds } },
      include: { movie_genres: { include: { genre: true } } }
    });

    return { movies: foundMovies, recognizedText: recognizedText || "" };

  } catch (error: any) {
    console.error("AI Voice Search Error:", error);
    if (error.message?.includes("429") || error.status === 429) {
        console.warn("AI Quota exceeded (Voice), returning empty list.");
        return { movies: [], recognizedText: "Hệ thống đang bận, vui lòng thử lại sau." };
    }
    return { movies: [], recognizedText: "" };
  }
};

export const searchMoviesByImage = async (imageBuffer: Buffer, mimeType: string) => {
  const movies = await prisma.movie.findMany({
    where: { is_deleted: false, is_active: true },
    take: 100,
    select: {
      id: true,
      title: true,
      movie_genres: { select: { genre: { select: { name: true } } } }
    }
  });

  const moviesContext = movies.map(m => {
    return `${m.id}|${m.title}|${m.movie_genres.map(g => g.genre.name).join(",")}`;
  }).join("\n");

  const promptText = `Dữ liệu phim (ID|Tên|Thể loại):
${moviesContext}

Phân tích hình ảnh và tìm phim phù hợp.
CHỈ trả về JSON mảng ID: ["id1","id2"]
Không giải thích.`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 

    const imagePart = fileToGenerativePart(imageBuffer, mimeType);
    
    const result = await model.generateContent([promptText, imagePart]);
    const responseText = result.response.text();

    const movieIds = safeParseJsonIds(responseText);

    if (movieIds.length === 0) return [];

    return await prisma.movie.findMany({
      where: { id: { in: movieIds } },
      include: { movie_genres: { include: { genre: true } } }
    });

  } catch (error: any) {
    console.error("AI Image Search Error:", error.message || error);
    if (error.message?.includes("429") || error.status === 429) {
        console.warn("AI Quota exceeded (Image), returning empty list.");
    }
    return [];
  }
};
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../lib/prisma";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function checkChatbotLimit(userId: string) {
  const activeSub = await prisma.userSubscription.findFirst({
    where: { user_id: userId, status: "ACTIVE", end_date: { gt: new Date() } },
    include: { plan: true },
  });

  let maxQuestions = 10;

  if (activeSub && activeSub.plan) {
    const benefits = activeSub.plan.benefits as Record<string, any>;
    maxQuestions = benefits?.chatbot_ai?.max_questions_per_day ?? 10;
  } else {
    try {
      let freeConfig = await prisma.systemConfig.findFirst({
        where: { key: "FREE_TIER_BENEFITS" },
      });
      
      if (!freeConfig) {
        freeConfig = await prisma.systemConfig.create({
          data: {
            id: '11111111-2222-3333-4444-555555555555',
            key: "FREE_TIER_BENEFITS",
            value: { chatbot_ai: { max_questions_per_day: 10 } },
            description: "Default free tier benefits (Auto-created)"
          }
        });
      }

      const value = freeConfig.value as Record<string, any>;
      maxQuestions = value?.chatbot_ai?.max_questions_per_day ?? 10;
    } catch (error) {
      maxQuestions = 10;
    }
  }

  if (maxQuestions === -1) {
    return { allowed: true, remaining: -1 };
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const todayQuestionCount = await prisma.chatbotLog.count({
    where: {
      user_id: userId,
      created_at: { gte: startOfDay, lte: endOfDay },
    },
  });

  const isAllowed = todayQuestionCount < maxQuestions;
  return {
    allowed: isAllowed,
    remaining: isAllowed ? maxQuestions - todayQuestionCount : 0,
  };
}

async function generateContentSafe(prompt: string, maxRetries = 2) {
  const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
  ];

  for (const modelName of modelsToTry) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { maxOutputTokens: 2048 },
        });
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (error: any) {
        if (
          error.message?.includes("404") ||
          error.status === 404 ||
          error.status === 400
        ) {
          console.warn(
            `Model ${modelName} không khả dụng, đang thử model tiếp theo...`,
          );
          break;
        }

        if (error.status === 429 || error.message?.includes("429")) {
          const retryMatch =
            error.message?.match(/retry in ([\d.]+)s/i) ||
            error.errorDetails
              ?.find((d: any) => d.retryDelay)
              ?.retryDelay?.match(/(\d+)/);
          const waitSec = retryMatch
            ? Math.ceil(parseFloat(retryMatch[1])) + 2
            : 20;

          if (attempt < maxRetries) {
            console.warn(
              `Rate limited (429). Retry ${attempt + 1}/${maxRetries} sau ${waitSec}s...`,
            );
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
  const cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed.map(String);
    return [];
  } catch {
    const matches = cleaned.match(/"([a-f0-9-]{36})"/g);
    if (matches && matches.length > 0) {
      return matches.map((m) => m.replace(/"/g, ""));
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

export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

    const result = await model.embedContent(text);
    let embedding = result.embedding.values;

    if (embedding.length > 1536) {
      embedding = embedding.slice(0, 1536);
    }

    return embedding;
  } catch (error) {
    console.error("Lỗi khi tạo embedding:", error);
    throw error;
  }
};

export const chatWithAI = async (userId: string, userMessage: string) => {
  try {
    //lấy ls chat của user
    const rawHistory = await prisma.chatbotLog.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      take: 10,
    });

    const chatHistory = rawHistory.reverse();

    const historyContext = chatHistory
      .map((log) => {
        return `User: ${log.user_message}\nBot: ${log.bot_response}`;
      })
      .join("\n\n");

    // Trích xuất các phim đã được nhắc tới gần đây (qua slug)
    const historySlugs: string[] = [];
    const slugRegex = /\/movies\/([a-zA-Z0-9-]+)/g;
    for (const log of chatHistory) {
      if (!log.bot_response) continue;
      let match;
      while ((match = slugRegex.exec(log.bot_response)) !== null) {
        historySlugs.push(match[1]);
      }
    }
    const uniqueSlugs = Array.from(new Set(historySlugs));

    // Lấy chi tiết các phim từ lịch sử
    let historyMovies: any[] = [];
    if (uniqueSlugs.length > 0) {
      historyMovies = await prisma.movie.findMany({
        where: { slug: { in: uniqueSlugs } },
        include: {
          movie_genres: { include: { genre: true } },
          movie_people: {
            take: 5,
            include: { person: true },
          },
        },
      });
    }

    //lấy  trí nhớ dài hạn
    const userMemory = await prisma.userAiMemory.findUnique({
      where: { user_id: userId },
    });

    const memoryContext = userMemory?.summary
      ? `THÔNG TIN SỞ THÍCH CỦA USER NÀY: ${userMemory.summary}`
      : "";

    //truy xuất ngữ cảnh mới từ câu hỏi
    const relevantMovies = await searchMoviesByAI(userMessage, 5);

    // Gộp phim từ lịch sử và kết quả tìm kiếm mới
    const combinedMoviesMap = new Map();
    historyMovies.forEach((m) => combinedMoviesMap.set(m.id, m));
    relevantMovies.forEach((m) => combinedMoviesMap.set(m.id, m));
    const allMoviesToProvide = Array.from(combinedMoviesMap.values());

    const moviesContext = allMoviesToProvide
      .map((m, index) => {
        const actors =
          m.movie_people?.map((mp: any) => mp.person.name).join(", ") ||
          "Chưa rõ";
        return `[Phim tham khảo] Tên: ${m.title}. Đường dẫn: /movies/${m.slug}. Diễn viên: ${actors}. Mô tả: ${m.description || "Đang cập nhật"}`;
      })
      .join("\n\n");

    const prompt = `
      Bạn là trợ lý tư vấn phim thông minh của hệ thống Movix.
      Nhiệm vụ của bạn là tư vấn phim cho User dựa trên Data được cung cấp. 
      ${memoryContext}

      [LỊCH SỬ TRÒ CHUYỆN GẦN ĐÂY]
      ${historyContext || "Chưa có lịch sử trò chuyện."}

      [PHIM CÓ TRONG HỆ THỐNG LIÊN QUAN ĐẾN CÂU HỎI]
      ${moviesContext || "Không tìm thấy phim phù hợp trong hệ thống."}

      [QUY TẮC TRÌNH BÀY BẮT BUỘC - RẤT QUAN TRỌNG]
      1. Khi liệt kê danh sách phim, BẮT BUỘC mỗi phim phải nằm trên một dòng riêng biệt (dùng \n ngay từ đầu).
      2. Tên phim BẮT BUỘC phải được tạo thành Hyperlink (Link Markdown) dựa trên "Đường dẫn" được cung cấp.
         Ví dụ format chuẩn: 1. [Tên Phim](/movies/slug-cua-phim) - Mô tả ngắn gọn...
      3. Không bịa đặt phim ngoài danh sách. Trả lời thân thiện.

      [CÂU HỎI HIỆN TẠI CỦA USER]
      User: ${userMessage}
      Bot:
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const botResponse = result.response.text();

    //lưu log trò chuyện
    await prisma.chatbotLog.create({
      data: {
        user_id: userId,
        user_message: userMessage,
        bot_response: botResponse,
      },
    });

    return botResponse;
  } catch (error: any) {
    console.error("Lỗi Chatbot Context-Aware:", error);
    throw new Error("Hệ thống Chatbot đang bận, vui lòng thử lại sau.");
  }
};

export const searchMoviesByAI = async (
  query: string,
  limit: number = 5,
  userId?: string,
) => {
  console.log("👉 Đang tìm kiếm AI với từ khóa:", query);
  try {
    const queryEmbeddingArray = await generateEmbedding(query);
    const queryEmbeddingString = `[${queryEmbeddingArray.join(",")}]`;
    console.log("✅ Đã tạo Vector cho câu hỏi thành công!");

    const similarMovies = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT 
        m.id, 
        m.title, 
        m.slug, 
        m.description,
        m.poster_url,
        m.release_date,
        1 - (m.embedding <=> $1::vector) as similarity_score
      FROM movies m
      WHERE m.is_deleted = false 
        AND m.is_active = true 
        AND m.embedding IS NOT NULL
      ORDER BY m.embedding <=> $1::vector
      LIMIT $2;
    `,
      queryEmbeddingString,
      limit,
    );

    if (similarMovies.length === 0) return [];

    const movieIds = similarMovies.map((m) => m.id);
    const moviesWithGenres = await prisma.movie.findMany({
      where: { id: { in: movieIds } },
      include: {
        movie_genres: { include: { genre: true } },
        movie_people: {
          take: 5,
          include: { person: true },
        },
      },
    });

    const result = similarMovies.map((rawMovie) => {
      const fullMovie = moviesWithGenres.find((m) => m.id === rawMovie.id);
      return {
        ...fullMovie,
        similarity_score: rawMovie.similarity_score,
      };
    });

    if (userId) {
      await prisma.chatbotLog.create({
        data: {
          user_id: userId,
          user_message: `[Text Search] ${query}`,
          bot_response: `Đã tìm thấy ${result.length} phim liên quan.`,
        },
      });
    }

    return result;
  } catch (error: any) {
    console.error("Lỗi AI Vector Search:", error.message || error);
    return [];
  }
};

export const searchMoviesByVoice = async (
  audioBuffer: Buffer,
  mimeType: string,
  userId?: string,
) => {
  try {
    const promptText = `Bạn là chuyên gia nhận diện giọng nói. 
Nhiệm vụ: Chuyển đoạn âm thanh này thành văn bản và trích xuất các từ khóa tìm kiếm phim (tên phim, diễn viên, hoặc thể loại).

TRẢ VỀ JSON:
{"recognizedText": "Nội dung đầy đủ bạn nghe được", "keywords": ["từ khóa 1", "từ khóa 2"]}`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const audioPart = fileToGenerativePart(audioBuffer, mimeType);
    const result = await model.generateContent([promptText, audioPart]);
    const responseText = result.response.text();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI transcription error");

    const parsedResult = JSON.parse(jsonMatch[0]);
    const recognizedText = parsedResult.recognizedText || "";
    const keywords = parsedResult.keywords || [];

    // Nếu không có keywords, dùng recognizedText làm keyword chính
    const searchTerms = keywords.length > 0 ? keywords : [recognizedText];

    console.log(`🎙️ Voice Search Keywords: [${searchTerms.join(", ")}]`);

    // Tìm kiếm trong TOÀN BỘ database dựa trên keywords
    const foundMovies = await prisma.movie.findMany({
      where: {
        is_deleted: false,
        is_active: true,
        OR: searchTerms.map((term: string) => ({
          OR: [
            { title: { contains: term, mode: "insensitive" } },
            { original_title: { contains: term, mode: "insensitive" } },
            { description: { contains: term, mode: "insensitive" } },
            {
              movie_genres: {
                some: {
                  genre: { name: { contains: term, mode: "insensitive" } },
                },
              },
            },
          ],
        })),
      },
      include: { movie_genres: { include: { genre: true } } },
      take: 20,
    });

    if (userId) {
      await prisma.chatbotLog.create({
        data: {
          user_id: userId,
          user_message: `[Voice Search] ${recognizedText}`,
          bot_response: `Đã tìm thấy ${foundMovies.length} phim phù hợp.`,
        },
      });
    }

    return { movies: foundMovies, recognizedText };
  } catch (error: any) {
    console.error("AI Voice Search Hybrid Error:", error);
    return { movies: [], recognizedText: "Lỗi xử lý AI hoặc Timeout" };
  }
};

export const searchMoviesByImage = async (
  imageBuffer: Buffer,
  mimeType: string,
  userId?: string,
) => {
  try {
    const movies = await prisma.movie.findMany({
      where: { is_deleted: false, is_active: true },
      take: 40,
      select: {
        id: true,
        title: true,
        release_date: true,
        movie_genres: { select: { genre: { select: { name: true } } } },
      },
    });

    const moviesContext = movies
      .map((m, i) => {
        const year = m.release_date
          ? new Date(m.release_date).getFullYear()
          : "N/A";
        const genres = m.movie_genres.map((g) => g.genre.name).join(",");
        return `${i + 1}|${m.title}|${year}|${genres}`;
      })
      .join("\n");

    const promptText = `Tìm phim phù hợp từ hình ảnh này trong danh sách (STT|Tên|Năm|Thể loại):
${moviesContext}
Chỉ trả về JSON mảng STT: [1, 5, 8]`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const imagePart = fileToGenerativePart(imageBuffer, mimeType);
    const result = await model.generateContent([promptText, imagePart]);
    const responseText = result.response.text();

    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("AI response format error");

    const indices = JSON.parse(jsonMatch[0]);
    const validIds = indices
      .map((idx: number) => movies[idx - 1]?.id)
      .filter((id: any): id is string => !!id);

    if (validIds.length === 0) return [];

    const foundMovies = await prisma.movie.findMany({
      where: { id: { in: validIds } },
      include: { movie_genres: { include: { genre: true } } },
    });

    const resultMovies = validIds
      .map((id: string) => foundMovies.find((m) => m.id === id))
      .filter((m: any): m is any => !!m);

    if (userId) {
      await prisma.chatbotLog.create({
        data: {
          user_id: userId,
          user_message: `[Image Search] Tìm kiếm bằng hình ảnh.`,
          bot_response: `Đã tìm thấy ${resultMovies.length} phim phù hợp.`,
        },
      });
    }

    return resultMovies;
  } catch (error: any) {
    console.error("AI Image Search Error:", error);
    return [];
  }
};
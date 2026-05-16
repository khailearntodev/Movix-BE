import { Prisma, MoodType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { sign } from "crypto";
import { generateContentSafe, safeParseJsonIds } from "./ai.service";
import { getPersonalizedRecommendations } from "./recommend.service";
import redis from '../lib/redis';
export class MoodService {
    static async analyzeTimeContext(hour: number, dayOfWeek: number): Promise<MoodType> {
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        if (isWeekend) {
            return MoodType.WEEKEND_BINGE;
        }
        if (hour >= 6 && hour <= 11) return MoodType.MORNING_CASUAL;
        if (hour >= 12 && hour <= 17) return MoodType.AFTERNOON_FOCUS;
        if (hour >= 18 && hour <= 21) return MoodType.EVENING_RELAX;
        if (hour >= 22 || hour <= 2) return MoodType.LATE_NIGHT_THRILLER;

        return MoodType.EVENING_RELAX; // Mặc định
    }

    static async analyzeUserBehavior(userId: string) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentHistory = await prisma.watchHistory.findMany({
            where: { user_id: userId, watched_at: { gte: sevenDaysAgo } },
            include: {
                episode: {
                    include: {
                        season: {
                            include: {
                                movie: {
                                    include: {
                                        movie_genres: {
                                            include: {
                                                genre: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { watched_at: 'desc' }
        });
        const shortWatchCount = recentHistory.filter(h => h.progress_seconds < 1200).length;
        const totalWatched = recentHistory.length;
        let behaviorSignal = '';
        if (shortWatchCount > totalWatched * 0.6) {
            behaviorSignal = 'SHORT_ATTENTION';
        } else if (shortWatchCount > totalWatched * 0.3) {
            behaviorSignal = 'MIXED';
        } else {
            behaviorSignal = 'DEEP_DIVER';
        }
        const genreCounts: Record<string, number> = {};
        recentHistory.forEach(h => {
            h.episode.season.movie.movie_genres.forEach(mg => {
                const genreName = mg.genre.name;
                genreCounts[genreName] = (genreCounts[genreName] || 0) + 1;
            });
        });
        const favoriteGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
        return { behaviorSignal, favoriteGenre };
    }
    static async resolveMood(TimeMood: MoodType, userBehaviorSignal: any): Promise<MoodType> {
        if (userBehaviorSignal == null) {
            return TimeMood;
        }
        if (userBehaviorSignal.behaviorSignal === 'SHORT_ATTENTION') {
            return MoodType.QUICK_WATCH;
        }
        if (userBehaviorSignal.behaviorSignal === 'DEEP_DIVER' && TimeMood !== MoodType.WEEKEND_BINGE) {
            return TimeMood;
        }
        return TimeMood;
    }
    static async detectMood(userId: string): Promise<{ mood: MoodType; context: any }> {
        const now = new Date();
        const hour = now.getHours();
        const dayOfWeek = now.getDay();
        const timeMood = await MoodService.analyzeTimeContext(hour, dayOfWeek);
        const userBehaviorSignal = await MoodService.analyzeUserBehavior(userId);
        const finalMood = await MoodService.resolveMood(timeMood, userBehaviorSignal);
        return {
            mood: finalMood,
            context: {
                hour,
                dayOfWeek,
                topGenres: userBehaviorSignal?.favoriteGenre ? [userBehaviorSignal.favoriteGenre] : [],
                signal: userBehaviorSignal?.behaviorSignal || 'COLD_START',
            }
        };
    }
    static async getMoodSuggestions(userId: string, mood: MoodType, context: any, limit: number = 8) {
        console.log(`\n--- [MoodService] BẮT ĐẦU TÌM GỢI Ý PHIM ---`);
        console.log(`User: ${userId} | Mood: ${mood} | Limit: ${limit}`);

        const candidateMovies = await getPersonalizedRecommendations(userId, 40);
        console.log(`[MoodService] Bước 1: Lấy Candidate pool (Recommendations) -> Thu được ${candidateMovies.length} phim.`);

        try {
            const prompt = `
      Bạn là chuyên gia gợi ý phim của hệ thống Movix. User hiện đang xem phim vào lúc ${context.hour}h với tâm trạng "${mood}".
      Dữ liệu hành vi gần đây: Hay xem thể loại ${context.topGenres.join(', ')}. Tín hiệu: ${context.signal}.
      
      Dưới đây là danh sách Candidate Pool (STT | ID | Tên phim):
      ${candidateMovies.map((m, idx) => `${idx + 1} | ${m.id} | ${m.title}`).join('\n')}

      Nhiệm vụ: Chọn ra đúng ${limit} phim phù hợp nhất với tâm trạng và hành vi trên.
      Chỉ trả về một mảng JSON chứa các con số STT (Số thứ tự) của phim được chọn, ví dụ: [1, 5, 8]. Không trả về text nào khác.
    `;
            console.log(`[MoodService] Bước 2: Đang gọi AI (Gemini) để chọn lọc...`);
            const result = await generateContentSafe(prompt);
            console.log(`[MoodService] Bước 3: AI phản hồi thành công. Dữ liệu ĐẦY ĐỦ từ AI:\n${result}\n`);

            const jsonMatch = result.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                try {
                    const parsedIndices = JSON.parse(jsonMatch[0]);
                    const suggestedIds = parsedIndices
                        .map((idx: number) => candidateMovies[idx - 1]?.id)
                        .filter((id: string | undefined) => !!id);

                    if (suggestedIds && suggestedIds.length > 0) {
                        console.log(`[MoodService] Bước 4: Parse JSON thành công -> AI đề xuất ${suggestedIds.length} IDs:`, suggestedIds);
                        const movies = await prisma.movie.findMany({
                            where: { id: { in: suggestedIds } }
                        });
                        console.log(`[MoodService] Bước 5: Truy vấn DB -> Tìm được ${movies.length} phim hợp lệ từ danh sách ID của AI.`);
                        if (movies.length > 0) {
                            console.log(`[MoodService] Danh sách phim sẽ trả về:`);
                            movies.forEach((m, idx) => console.log(`  ${idx + 1}. [${m.id}] - ${m.title}`));
                            console.log(`--- [MoodService] KẾT THÚC THÀNH CÔNG BẰNG AI ---\n`);
                            return movies;
                        } else {
                            console.log(`[MoodService] LƯU Ý: AI trả về ID nhưng không khớp DB. Chuyển sang Fallback.`);
                        }
                    } else {
                        console.log(`[MoodService] LƯU Ý: Không parse được ID hợp lệ nào từ mảng index. Chuyển sang Fallback.`);
                    }
                } catch (e) {
                    console.log(`[MoodService] LƯU Ý: Parse JSON mảng STT thất bại. Chuyển sang Fallback.`);
                }
            } else {
                console.log(`[MoodService] LƯU Ý: Không trích xuất được mảng JSON/UUID hợp lệ từ câu trả lời AI. Chuyển sang Fallback.`);
            }
        } catch (error) {
            console.error("[MoodService] LỖI EXCEPTION: Quá trình gọi AI hoặc parse JSON bị lỗi!", error);
        }

        console.log(`[MoodService] Bước 6: Đang sử dụng phương pháp Fallback (Rule-based) cho mood: ${mood}`);
        const fallbackMovies = await this.getRuleSuggestions(mood, limit);
        fallbackMovies.forEach((m, idx) => console.log(`  ${idx + 1}. [${m.id}] - ${m.title}`));

        return fallbackMovies;
    }
    static async getRuleSuggestions(mood: MoodType, limit: number) {
        let targetGenres: string[] = [];
        switch (mood) {
            case 'EVENING_RELAX': targetGenres = ['Lãng mạn', 'Lãng Mạn', 'Phim Lãng Mạn', 'Hài', 'Phim Hài', 'Gia đình', 'Phim Gia Đình', 'Gia Đình']; break;
            case 'LATE_NIGHT_THRILLER': targetGenres = ['Kinh dị', 'Phim Kinh Dị', 'Giật gân', 'Phim Gây Cấn', 'Bí ẩn', 'Phim Bí Ẩn', 'Kì bí']; break;
            case 'AFTERNOON_FOCUS': targetGenres = ['Tài liệu', 'Chính kịch', 'Phim Chính Kịch', 'Hình Sự', 'Phim Hình Sự', 'Hình sự']; break;
            case 'MORNING_CASUAL': targetGenres = ['Hoạt hình', 'Phim Hoạt Hình', 'Anime', 'Hài', 'Phim Hài']; break;
            default: targetGenres = ['Hành động', 'Phim Hành Động', 'Hành Động', 'Action & Adventure', 'Phiêu lưu', 'Phim Phiêu Lưu', 'Phiêu Lưu'];
        }

        return await prisma.movie.findMany({
            where: {
                is_active: true,
                movie_genres: { some: { genre: { name: { in: targetGenres } } } }
            },
            take: limit,
            orderBy: { view_count: 'desc' }
        });
    }
    static async getCacheMood(userId: string): Promise<{ mood: MoodType; context: any } | null> {
        const key = `mood:suggestion:${userId}`;
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    }
    static async setCacheMood(userId: string, moodData: { mood: MoodType; context: any }, ttlSeconds = 3600 * 6) {
        const key = `mood:suggestion:${userId}`;
        await redis.set(key

            , JSON.stringify(moodData), 'EX', ttlSeconds);
    }

}

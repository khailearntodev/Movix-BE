import { Prisma, MoodType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { sign } from "crypto";
import { generateContentSafe } from "./ai.service";
import { getPersonalizedRecommendations } from "./recommend.service";
import redis from '../lib/redis';
export class MoodService {
    static async analyzeTimesContext(hour: number, dayOfWeek: number): Promise<MoodType> {
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
        let behavierSignal = '';
        if (shortWatchCount > totalWatched * 0.6) {
            behavierSignal = 'SHORT_ATTENTION';
        } else if (shortWatchCount > totalWatched * 0.3) {
            behavierSignal = 'MIXED';
        } else {
            behavierSignal = 'DEEP_DIVER';
        }
        const genreCounts: Record<string, number> = {};
        recentHistory.forEach(h => {
            h.episode.season.movie.movie_genres.forEach(mg => {
                const genreName = mg.genre.name;
                genreCounts[genreName] = (genreCounts[genreName] || 0) + 1;
            });
        });
        const favoriteGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
        return { behavierSignal, favoriteGenre };
    }
    static async resoleveMood(TimeMood: MoodType, userBahaviorSignal: any): Promise<MoodType> {
        if (userBahaviorSignal == null) {
            return TimeMood;
        }
        if (userBahaviorSignal.behavierSignal === 'SHORT_ATTENTION') {
            return MoodType.QUICK_WATCH;
        }
        if (userBahaviorSignal.behavierSignal === 'DEEP_DIVER' && TimeMood !== MoodType.WEEKEND_BINGE) {
            return TimeMood;
        }
        return TimeMood;
    }
    static async detectMood(userId: string): Promise<{ mood: MoodType; context: any }> {
        const now = new Date();
        const hour = now.getHours();
        const dayOfWeek = now.getDay();
        const timeMood = await MoodService.analyzeTimesContext(hour, dayOfWeek);
        const userBehaviorSignal = await MoodService.analyzeUserBehavior(userId);
        const finalMood = await MoodService.resoleveMood(timeMood, userBehaviorSignal);
        return {
            mood: finalMood,
            context: {
                hour,
                dayOfWeek,
                topGenres: userBehaviorSignal?.favoriteGenre || [],
                signal: userBehaviorSignal?.behavierSignal || 'COLD_START',
            }
        };
    }
    static async getMoodSuggestions(userId: string, mood: MoodType, context: any, limit: number = 8) {
        const candidateMovies = await getPersonalizedRecommendations(userId, 40);

        try {
            const prompt = `
      Bạn là chuyên gia gợi ý phim của hệ thống Movix. User hiện đang xem phim vào lúc ${context.hour}h với tâm trạng "${mood}".
      Dữ liệu hành vi gần đây: Hay xem thể loại ${context.topGenres.join(', ')}. Tín hiệu: ${context.signal}.
      
      Dưới đây là danh sách Candidate Pool (ID và Title):
      ${JSON.stringify(candidateMovies.map(m => ({ id: m.id, title: m.title })))}

      Nhiệm vụ: Chọn ra đúng ${limit} phim phù hợp nhất với tâm trạng và hành vi trên.
      Chỉ trả về JSON format là một mảng string chứa các ID: ["id1", "id2", ...]. Không trả về text nào khác.
    `;
            const result = await generateContentSafe(prompt);
            const jsonMatch = result.match(/\[.*\]/s);
            if (jsonMatch) {
                const suggestedIds = JSON.parse(jsonMatch[0]);
                return await prisma.movie.findMany({
                    where: { id: { in: suggestedIds } }
                });
            }
        }

        catch (error) {
            console.error("Error in getMoodSuggestions:", error);
            return [];
        }
        return this.getRuleSuggestions(mood, limit);

    }
    static async getRuleSuggestions(mood: MoodType, limit: number) {
        let targetGenres: string[] = [];
        switch (mood) {
            case 'EVENING_RELAX': targetGenres = ['Romance', 'Comedy', 'Family']; break;
            case 'LATE_NIGHT_THRILLER': targetGenres = ['Horror', 'Thriller', 'Mystery']; break;
            case 'AFTERNOON_FOCUS': targetGenres = ['Documentary', 'Drama']; break;
            case 'MORNING_CASUAL': targetGenres = ['Animation', 'Comedy']; break;
            default: targetGenres = ['Action', 'Adventure'];
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

import { Request, Response } from 'express';
import * as moodService from '../services/mood.service';
import * as interactionService from '../services/interaction.service';
import { Prisma, MoodType } from "@prisma/client";
import { prisma } from '../lib/prisma';

const MOOD_UI_MAP: Record<MoodType, { label: string, emoji: string, description: string }> = {
    MORNING_CASUAL: { label: "Bắt đầu ngày mới", emoji: "🌅", description: "Phim nhẹ nhàng, tươi sáng cho buổi sáng" },
    AFTERNOON_FOCUS: { label: "Trưa tập trung", emoji: "☕", description: "Phim tài liệu hoặc tâm lý cuốn hút" },
    EVENING_RELAX: { label: "Thư giãn buổi tối", emoji: "🌙", description: "Phim nhẹ nhàng, tình cảm hoặc hài hước cho buổi tối" },
    LATE_NIGHT_THRILLER: { label: "Kịch tính đêm khuya", emoji: "🦉", description: "Cảm giác mạnh với phim kinh dị, giật gân" },
    WEEKEND_BINGE: { label: "Cày phim cuối tuần", emoji: "🍿", description: "Series dài tập hoặc bom tấn hành động" },
    QUICK_WATCH: { label: "Xem nhanh giải trí", emoji: "⚡", description: "Phim ngắn, nhịp độ nhanh" }
};
export const moodController = {
    detectMood: async (req: Request, res: Response) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            const cachedData = await moodService.MoodService.getCacheMood(userId);
            if (cachedData) {
                return res.status(200).json({
                    success: true,
                    data: { ...cachedData, cached: true }
                });
            }
            const { mood, context } = await moodService.MoodService.detectMood(userId)
            const suggestedMovies = await moodService.MoodService.getMoodSuggestions(userId, mood, context, 8);
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 6);
            const responseData = {
                mood,
                ...MOOD_UI_MAP[mood],
                movies: suggestedMovies,
                context,
                expires_at: expiresAt.toISOString()
            };
            await moodService.MoodService.setCacheMood(userId, responseData);
            await prisma.userMoodSession.create({
                data: {
                    user_id: userId,
                    mood,
                    context_hour: context?.hour,
                    context_day: context?.dayOfWeek,
                    genre_ids: context?.topGenres || [],
                    expires_at: expiresAt,
                }
            });

            const playlist = await interactionService.createMoodPlaylist(userId, mood, suggestedMovies.map(m => m.id));

            res.status(200).json({
                success: true,
                data: {
                    ...responseData,
                    playlist_id: playlist.id
                }
            });

        } catch (error) {
            console.error("Error in detectMood:", error);
            res.status(500).json({ message: 'Lỗi server' });
        }
    },

    suggestMood: async (req: Request, res: Response) => {
        try {
            const userId = req.userId;
            const { mood, limit } = req.body as { mood: MoodType, limit?: number };
            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            if (!mood || !Object.values(MoodType).includes(mood)) {
                return res.status(400).json({ message: 'Mood không hợp lệ' });
            }

            const now = new Date();
            const context = {
                hour: now.getHours(),
                dayOfWeek: now.getDay(),
                topGenres: [],
                signal: 'MANUAL_OVERRIDE'
            };

            const suggestedMovies = await moodService.MoodService.getMoodSuggestions(userId, mood, context, limit || 8);
            
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 6);
            
            const responseData = {
                mood,
                ...MOOD_UI_MAP[mood],
                movies: suggestedMovies,
                context,
                expires_at: expiresAt.toISOString()
            };

            await moodService.MoodService.setCacheMood(userId, responseData);
            
            await prisma.userMoodSession.create({
                data: {
                    user_id: userId,
                    mood,
                    context_hour: context.hour,
                    context_day: context.dayOfWeek,
                    genre_ids: context.topGenres,
                    expires_at: expiresAt,
                }
            });

            const playlist = await interactionService.createMoodPlaylist(userId, mood, suggestedMovies.map(m => m.id));

            res.status(200).json({
                success: true,
                data: {
                    ...responseData,
                    playlist_id: playlist.id
                }
            });
        } catch (error) {
            console.error("Error in suggestMood:", error);
            res.status(500).json({ message: 'Lỗi server' });
        }
    }
};

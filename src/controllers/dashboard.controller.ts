import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const dashboardController = {
  getStats: async (req: Request, res: Response) => {
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const [totalUsers, totalMovies, totalViews, newCommentsToday] = await Promise.all([
        // Đếm tổng user
        prisma.user.count(),
        // Đếm phim đang active (không tính phim đã xóa mềm)
        prisma.movie.count({ where: { is_deleted: false, is_active: true } }),   
        // Đếm tổng lượt xem từ bảng WatchHistory
        prisma.watchHistory.count(),
        // Đếm bình luận mới trong ngày hôm nay
        prisma.comment.count({
          where: { created_at: { gte: startOfToday } }
        }),
      ]);

      res.status(200).json({
        users: totalUsers,
        movies: totalMovies,
        views: totalViews,
        comments_today: newCommentsToday,
      });
    } catch (error) {
      console.error("Dashboard Stats Error:", error);
      res.status(500).json({ message: 'Lỗi lấy số liệu thống kê' });
    }
  },

  // 2. API Biểu đồ tròn: Phân bố phim theo thể loại 
  getGenreDistribution: async (req: Request, res: Response) => {
    try {
      const genres = await prisma.genre.findMany({
        take: 5,
        include: {
          _count: {
            select: { movie_genres: true },
          },
        },
        orderBy: {
          movie_genres: {
            _count: 'desc',
          },
        },
      });

      const data = genres.map((g, index) => ({
        genre: g.name,
        count: g._count.movie_genres,
        fill: `var(--chart-${index + 1})`,
      }));

      res.status(200).json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Lỗi lấy biểu đồ thể loại' });
    }
  },

  // 3. API Biểu đồ cột: Top phim được yêu thích nhất
  getTopFavoritedMovies: async (req: Request, res: Response) => {
    try {
      const movies = await prisma.movie.findMany({
        take: 7,
        where: { is_deleted: false },
        include: {
          _count: {
            select: { favourites: true }
          }
        },
        orderBy: {
          favourites: {
            _count: 'desc'
          }
        }
      });

      const data = movies.map((m, index) => ({
        movie: m.title,
        favorites: m._count.favourites,
        fill: `var(--chart-${(index % 5) + 1})`
      }));

      res.status(200).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi lấy top phim' });
    }
  },

  // 4. API Danh sách người dùng mới nhất
  getRecentUsers: async (req: Request, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        take: 5,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          username: true,
          display_name: true,
          email: true,
          avatar_url: true,
          created_at: true,
        },
      });
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi lấy user mới' });
    }
  },

  getReportData: async (req: Request, res: Response) => {
    try {
      const [totalUsers, totalMovies, totalViews, totalComments] = await Promise.all([
        prisma.user.count(),
        prisma.movie.count({ where: { is_deleted: false } }),
        prisma.watchHistory.count(),
        prisma.comment.count(),
      ]);

      const monthlyStats = await prisma.$queryRaw`
        SELECT 
          TO_CHAR(created_at, 'MM/YYYY') as month,
          COUNT(*)::int as users
        FROM "User"
        WHERE created_at > NOW() - INTERVAL '6 months'
        GROUP BY TO_CHAR(created_at, 'MM/YYYY'), DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) ASC
      `;

      // Thống kê theo ngày (30 ngày gần nhất)
      const dailyStatsRaw: any[] = await prisma.$queryRaw`
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM-DD') as date_full,
          COUNT(*)::int as users
        FROM "User"
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD'), DATE_TRUNC('day', created_at)
        ORDER BY DATE_TRUNC('day', created_at) ASC
      `;

      // Fill dữ liệu cho các ngày không có user mới
      const dailyStats = [];
      const today = new Date();
      for (let i = 30; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
        const displayDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        
        const found = dailyStatsRaw.find((item: any) => item.date_full === dateStr);
        dailyStats.push({
            date: displayDate,
            users: found ? found.users : 0
        });
      }

      const topMovies = await prisma.movie.findMany({
        take: 7,
        where: { is_deleted: false },
        select: {
          title: true,
          view_count: true
        },
        orderBy: {
          view_count: 'desc'
        }
      });

      const topGenres = await prisma.genre.findMany({
        take: 5,
        select: {
          name: true,
          movie_genres: {
            include: {
              movie: {
                select: {
                  view_count: true
                }
              }
            }
          }
        }
      });
      
      const genreData = topGenres.map((g) => ({
        genre: g.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        views: g.movie_genres.reduce((sum: number, mg: any) => {
            return sum + (mg.movie.view_count || 0);
        }, 0),
        fill: "var(--color-" + g.name + ")" 
      })).sort((a, b) => b.views - a.views);

      const topUsers = await prisma.user.findMany({
        take: 5,
        select: {
          username: true,
          _count: { select: { comments: true } }
        },
        orderBy: {
          comments: { _count: 'desc' }
        }
      });

      res.status(200).json({
        kpi: { totalUsers, totalMovies, totalViews, totalComments },
        monthlyData: monthlyStats,
        dailyData: dailyStats,
        topMoviesData: topMovies.map(m => ({ movie: m.title, views: m.view_count })), 
        genreData: genreData,
        topUsersData: topUsers.map(u => ({ user: u.username, comments: u._count.comments }))
      });

    } catch (error) {
      console.error("Report Data Error:", error);
      res.status(500).json({ message: 'Lỗi lấy dữ liệu báo cáo' });
    }
  }
};
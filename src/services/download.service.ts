import { prisma } from '../lib/prisma';
import { DownloadStatus } from '@prisma/client';

export class DownloadService {
  static MAX_DOWNLOADS = 50;

  static async requestDownload(userId: string, deviceId: string, episodeId: string) {
    const canDownLoad= await prisma.userSubscription.findUnique({
        where: { user_id: userId },
        include: {
            plan: true,
        },
    });
    if (!canDownLoad || canDownLoad.status !== 'ACTIVE') {
      throw new Error('Bạn cần có gói đăng ký hoạt động để tải phim offline.');
    }
    const activeDownloads = await prisma.offlineDownload.count({
      where: {
        user_id: userId,
        status: { in: [DownloadStatus.PENDING, DownloadStatus.COMPLETED] },
      },
    });

    if (activeDownloads >= this.MAX_DOWNLOADS) {
      throw new Error(`Bạn đã đạt giới hạn ${this.MAX_DOWNLOADS} phim tải. Vui lòng xoá bớt để tải thêm.`);
    }

    const episode = await prisma.episode.findUnique({
      where: { id: episodeId },
      include: {
        season: true,
      },
    });

    if (!episode) {
      throw new Error('Không tìm thấy tập phim');
    }

    if (!episode.video_url) {
      throw new Error('Tập phim này chưa hỗ trợ phân giải video tải xuống.');
    }

    const movieId = episode.season?.movie_id;

    const existingDownload = await prisma.offlineDownload.findFirst({
      where: {
        user_id: userId,
        episode_id: episodeId,
        device_id: deviceId,
        status: { in: [DownloadStatus.PENDING, DownloadStatus.COMPLETED] },
      },
    });

    if (existingDownload) {
      if (existingDownload.status === DownloadStatus.COMPLETED) {
         throw new Error('Bạn đã tải tập phim này trên thiết bị này rồi');
      }
      return {
        download: existingDownload,
        videoUrl: episode.video_url,
      };
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const download = await prisma.offlineDownload.create({
      data: {
        user_id: userId,
        device_id: deviceId,
        episode_id: episodeId,
        movie_id: movieId, 
        status: DownloadStatus.PENDING,
        file_path: '',
        expires_at: expiresAt,
      },
    });

    return {
      download,
      videoUrl: episode.video_url,
    };
  }

  static async completeDownload(userId: string, downloadId: string, filePath: string) {
    const download = await prisma.offlineDownload.findUnique({ where: { id: downloadId } });
    if (!download || download.user_id !== userId) {
      throw new Error('Không tìm thấy giao dịch tải xuống');
    }

    return prisma.offlineDownload.update({
      where: { id: downloadId },
      data: {
        status: DownloadStatus.COMPLETED,
        file_path: filePath || '',
        downloaded_at: new Date(),
      },
    });
  }

  static async removeDownload(userId: string, downloadId: string) {
    const download = await prisma.offlineDownload.findUnique({ where: { id: downloadId } });
    if (!download || download.user_id !== userId) {
      throw new Error('Không tìm thấy giao dịch tải xuống để xoá');
    }

    return prisma.offlineDownload.update({
      where: { id: downloadId },
      data: {
        status: DownloadStatus.REMOVED,
      },
    });
  }

  static async getUserDownloads(userId: string, deviceId?: string) {
    const filters: any = {
      user_id: userId,
      status: { in: [DownloadStatus.PENDING, DownloadStatus.COMPLETED] },
    };
    if (deviceId) {
      filters.device_id = deviceId;
    }

    return prisma.offlineDownload.findMany({
      where: filters,
      include: {
        episode: true,
        movie: true,
      },
      orderBy: { downloaded_at: 'desc' }
    });
  }
}

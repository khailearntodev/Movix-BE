import { Request, Response } from 'express';
import { watchPartyService } from '../services/watch-party.service';
import { webSocketService } from '../index';

export const watchPartyController = {

  // 1. Tạo phòng mới (Live hoặc Scheduled)
  create: async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { title, movieId, episodeId, isPrivate, scheduledAt } = req.body;

      if (!title || !movieId) {
        return res.status(400).json({ message: "Thiếu tên phòng hoặc phim." });
      }

      const newRoom = await watchPartyService.create(userId, {
        title,
        movieId,
        episodeId,
        isPrivate,
        scheduledAt
      });

      res.status(201).json(newRoom);
    } catch (error: any) {
      if (error.message === "USER_HAS_ACTIVE_PARTY") {
        return res.status(409).json({ message: "Bạn đang có một phòng hoạt động. Hãy kết thúc nó trước khi tạo mới." });
      }
      if (error.message === "MOVIE_SOURCE_NOT_FOUND") {
        return res.status(404).json({ message: "Không tìm thấy tập phim để phát." });
      }

      console.error("Create Party Error:", error);
      res.status(500).json({ message: "Lỗi máy chủ khi tạo phòng." });
    }
  },

  // 2. Lấy danh sách phòng (Sảnh chờ - Có lọc & Tìm kiếm)
  getAll: async (req: Request, res: Response) => {
    try {
      const filter = (req.query.filter as 'live' | 'scheduled' | 'ended') || 'live';
      const search = req.query.q as string | undefined;

      const rooms = await watchPartyService.getAll(filter, search);

      res.json(rooms);
    } catch (error) {
      console.error("Get All Parties Error:", error);
      res.status(500).json({ message: "Lỗi lấy danh sách phòng." });
    }
  },

  // 3. Lấy chi tiết phòng (Để tham gia vào phòng)
  getDetails: async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      if (!id) return res.status(400).json({ message: "Thiếu ID phòng." });

      const result = await watchPartyService.getDetails(id, userId);
      res.json(result);
    } catch (error: any) {
      if (error.message === "PARTY_NOT_FOUND") return res.status(404).json({ message: "Phòng không tồn tại." });
      if (error.message === "PARTY_ENDED") return res.status(410).json({ message: "Phòng đã kết thúc." });

      console.error("Get Party Details Error:", error);
      res.status(500).json({ message: "Lỗi khi lấy thông tin phòng." });
    }
  },

  // 4. Đăng ký/Hủy đăng ký nhận thông báo
  toggleReminder: async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const result = await watchPartyService.toggleReminder(userId, id);
      res.json(result);
    } catch (error) {
      console.error("Toggle Reminder Error:", error);
      res.status(500).json({ message: "Lỗi đăng ký thông báo." });
    }
  },

  // 5. Hủy lịch công chiếu (Chỉ Host - Xóa phòng chưa bắt đầu)
  cancel: async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      await watchPartyService.cancel(userId, id);

      res.json({ success: true, message: "Đã hủy lịch công chiếu." });
    } catch (error: any) {
      if (error.message === "NOT_HOST") return res.status(403).json({ message: "Bạn không phải chủ phòng." });
      if (error.message === "PARTY_ALREADY_STARTED") return res.status(400).json({ message: "Phim đang chiếu, không thể hủy lịch." });

      console.error("Cancel Party Error:", error);
      res.status(500).json({ message: "Lỗi khi hủy phòng." });
    }
  },

  // 6. Kết thúc phòng đang chiếu (Chỉ Host hoặc Admin)
  end: async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      await watchPartyService.end(userId, id);

      await webSocketService.endRoom(id);

      res.json({ success: true, message: "Đã kết thúc phòng xem chung." });
    } catch (error: any) {
      if (error.message === "NOT_HOST") {
        return res.status(403).json({ message: "Bạn không phải chủ phòng." });
      }
      console.error("End Party Error:", error);
      res.status(500).json({ message: "Lỗi khi kết thúc phòng." });
    }
  },

  joinByCode: async (req: Request, res: Response) => {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ message: "Vui lòng nhập mã phòng." });

      const result = await watchPartyService.joinByCode(code);
      res.json(result);
    } catch (error: any) {
      if (error.message === "INVALID_CODE") return res.status(404).json({ message: "Mã phòng không tồn tại." });
      if (error.message === "PARTY_ENDED") return res.status(410).json({ message: "Phòng này đã kết thúc." });
      res.status(500).json({ message: "Lỗi máy chủ." });
    }
  },

  getDetailsById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const room = await watchPartyService.getDetailsById(id);
      return res.status(200).json(room);
    } catch (error: any) {
      if (error.message === "PARTY_NOT_FOUND") return res.status(404).json({ message: "Phòng không tồn tại." });
      console.error("Get Details By Id Error:", error);
      res.status(500).json({ message: "Lỗi khi lấy thông tin phòng." });
    }
  },

  getStats: async (req: Request, res: Response) => {
    try {
      const stats = await watchPartyService.getStats();
      return res.status(200).json(stats);
    } catch (error) {
      console.error("Get Stats Error:", error);
      res.status(500).json({ message: "Lỗi khi lấy số liệu." });
    }
  },

  banUser: async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { id: partyId } = req.params;
      const { targetUserId } = req.body;

      await watchPartyService.banUser(userId, targetUserId, partyId);
      await webSocketService.banUser(targetUserId, partyId);

      return res.status(200).json({ success: true, message: "Đã ban thành viên khỏi phòng." });
    } catch (error: any) {
      if (error.message === "NOT_AUTHORIZED") {
        return res.status(403).json({ message: "Bạn không có quyền thực hiện hành động này." });
      }
      console.error("Ban User Error:", error);
      res.status(500).json({ message: "Lỗi khi ban thành viên." });
    }
  },

  muteUser: async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { id: partyId } = req.params;
      const { targetUserId, mute } = req.body;

      await watchPartyService.muteUser(userId, targetUserId, partyId, mute);
      await webSocketService.muteUser(targetUserId, partyId, mute);

      return res.status(200).json({
        success: true,
        message: mute ? "Đã tắt tiếng thành viên." : "Đã mở tiếng thành viên."
      });
    } catch (error: any) {
      if (error.message === "NOT_AUTHORIZED") {
        return res.status(403).json({ message: "Bạn không có quyền thực hiện hành động này." });
      }
      console.error("Mute User Error:", error);
      res.status(500).json({ message: "Lỗi khi tắt tiếng thành viên." });
    }
  },

  // 12. Lấy danh sách tin nhắn bị báo cáo (Admin)
  getFlaggedMessages: async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const messages = await watchPartyService.getFlaggedMessages(userId, id);
      return res.status(200).json(messages);
    } catch (error: any) {
      if (error.message === "NOT_AUTHORIZED") {
        return res.status(403).json({ message: "Bạn không có quyền thực hiện hành động này." });
      }
      console.error("Get Flagged Messages Error:", error);
      res.status(500).json({ message: "Lỗi khi lấy tin nhắn bị báo cáo." });
    }
  },

  // 13. Xử lý tin nhắn bị báo cáo (Admin)
  resolveFlaggedMessage: async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { messageId } = req.params;
      const { action } = req.body;

      if (!["delete", "ignore"].includes(action)) {
        return res.status(400).json({ message: "Hành động không hợp lệ." });
      }

      const isDeleted = action === "delete";
      const result = await watchPartyService.resolveFlaggedMessage(userId, messageId, isDeleted);

      if (result.partyId) {
        if (isDeleted) {
          await webSocketService.deleteMessage(messageId, result.partyId);
        } else {
          // Nếu là ignore (Bỏ qua), thì "nhả" tin nhắn ra cho cả phòng thấy
          await webSocketService.releaseMessage(result.data, result.partyId);
        }
      }

      return res.status(200).json({
        success: true,
        message: isDeleted ? "Đã xóa tin nhắn vi phạm." : "Đã bỏ qua báo cáo."
      });
    } catch (error: any) {
      if (error.message === "NOT_AUTHORIZED") {
        return res.status(403).json({ message: "Bạn không có quyền thực hiện hành động này." });
      }
      console.error("Resolve Message Error:", error);
      res.status(500).json({ message: "Lỗi khi xử lý tin nhắn." });
    }
  },
};
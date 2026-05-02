import { Request, Response } from "express";
import * as adminGamificationService from "../services/admin.gamification.service";
import { get } from "http";
import { create } from "domain";

export const adminGamificationController = {
  getSystemRanks: async (req: Request, res: Response) => {
    try {
      const ranks = await adminGamificationService.getSystemRanks();
      res.status(200).json({
        success: true,
        message: "Lấy danh sách ranks thành công",
        ranks,
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Lỗi lấy danh sách ranks",
        error: error.message,
      });
    }
  },
  updateSystemRank: async (req: Request, res: Response) => {
    if (!req.body || !req.body.NEWBIE || !req.body.LEGEND) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ. Vui lòng cung cấp đủ các mốc hạng.",
      });
    }
    try {
      const ranks = await adminGamificationService.updateSystemRank(req.body);
      res
        .status(200)
        .json({ success: true, message: "Cập nhật ranks thành công", ranks });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Lỗi cập nhật ranks",
        error: error.message,
      });
    }
  },

  getAllAchievements: async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const isActive = req.query.isActive
      ? req.query.isActive === "true"
      : undefined;
    try {
      const result = await adminGamificationService.getAllAchievements(
        page,
        limit,
        isActive,
      );
      res.status(200).json({
        success: true,
        message: "Lấy danh sách achievements thành công",
        ...result,
      });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Lỗi lấy danh sách achievements",
        error: error.message,
      });
    }
  },

  createAchievement: async (req: Request, res: Response) => {
    try {
      const {
        name,
        description,
        icon_url,
        condition_type,
        condition_value,
        reward_xp,
        is_active,
      } = req.body;

      if (
        !name ||
        !condition_type ||
        condition_value === undefined ||
        reward_xp === undefined
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Vui lòng cung cấp đủ các trường bắt buộc: name, condition_type, condition_value, reward_xp",
        });
      }

      const validConditionTypes = [
        "TOTAL_WATCH_TIME",
        "LOGIN_STREAK",
        "TOTAL_COMMENTS",
        "XP",
      ];

      if (!validConditionTypes.includes(condition_type)) {
        return res.status(400).json({
          success: false,
          message: `condition_type không hợp lệ. Phải thuộc: ${validConditionTypes.join(", ")}`,
        });
      }

      const newAchievement = await adminGamificationService.createAchievement(
        req.body,
      );

      return res.status(201).json({
        success: true,
        message: "Tạo thành tựu mới thành công",
        data: newAchievement,
      });
    } catch (error: any) {
      console.error("Lỗi tạo thành tựu mới:", error);

      if (error.message === "ACHIEVEMENT_NAME_EXISTS") {
        return res.status(409).json({
          success: false,
          message: "Tên thành tựu này đã tồn tại trong hệ thống",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Lỗi server khi tạo thành tựu mới",
      });
    }
  },

  updateAchievement: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedAchievement =
        await adminGamificationService.updateAchievement(id, updateData);
      return res.status(200).json({
        success: true,
        message: "Cập nhật thành tựu thành công",
        data: updatedAchievement,
      });
    } catch (error: any) {
      console.error("Lỗi cập nhật thành tựu:", error);
      if (error.message === "ACHIEVEMENT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Thành tựu không tồn tại",
        });
      }
      return res.status(500).json({
        success: false,
        message: "Lỗi server khi cập nhật thành tựu",
      });
    }
  },

  toggleAchievement: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "ID của thành tựu cần bật/tắt không được để trống",
        });
      }

      const toggledAchievement =
        await adminGamificationService.toggleAchievement(id);
      return res.status(200).json({
        success: true,
        message: "Bật/tắt thành tựu thành công",
        data: toggledAchievement,
      });
    } catch (error: any) {
      console.error("Lỗi bật/tắt thành tựu:", error);
      if (error.message === "ACHIEVEMENT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Thành tựu không tồn tại",
        });
      }
      return res.status(500).json({
        success: false,
        message: "Lỗi server khi bật/tắt thành tựu",
      });
    }
  },

  getAchievementByUserId: async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "ID người dùng không được để trống",
        });
      }
      const userAchievements =
        await adminGamificationService.getUserAchievements(userId);
      return res.status(200).json({
        success: true,
        message: "Lấy thành tựu của người dùng thành công",
        data: userAchievements,
      });
    } catch (error: any) {
      console.error("Lỗi lấy thành tựu của người dùng:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server khi lấy thành tựu của người dùng",
      });
    }
  },

  grantXpToUser: async (req: Request, res: Response) => {
    try {
      const { xp } = req.body;
      const { userId } = req.params;
      if (!userId || xp === undefined) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng cung cấp userId và xp cần cấp",
        });
      }
      const updatedUser = await adminGamificationService.grantXPToUser(
        userId,
        xp,
      );
      return res.status(200).json({
        success: true,
        message: `Cấp ${xp} XP cho người dùng thành công`,
        data: updatedUser,
      });
    } catch (error: any) {
      console.error("Lỗi cấp XP cho người dùng:", error);
      if (error.message === "USER_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Người dùng không tồn tại",
        });
      }
      return res.status(500).json({
        success: false,
        message: "Lỗi server khi cấp XP cho người dùng",
      });
    }
  },

  grantAchievementToUser: async (req: Request, res: Response) => {
    try {
      const { achievementId } = req.body;
      const { userId } = req.params;
      if (!userId || !achievementId) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng cung cấp userId và achievementId cần cấp",
        });
      }
      const userAchievement =
        await adminGamificationService.grantAchievementToUser(
          userId,
          achievementId,
        );
      return res.status(200).json({
        success: true,
        message: `Cấp thành tựu cho người dùng thành công`,
        data: userAchievement,
      });
    } catch (error: any) {
      console.error("Lỗi cấp thành tựu cho người dùng:", error);
      if (error.message === "USER_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Người dùng không tồn tại",
        });
      }
      if (error.message === "ACHIEVEMENT_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Thành tựu không tồn tại",
        });
      }
      if (error.message === "USER_ALREADY_HAS_ACHIEVEMENT") {
        return res.status(409).json({
          success: false,
          message: "Người dùng đã có thành tựu này",
        });
      }
      return res.status(500).json({
        success: false,
        message: "Lỗi server khi cấp thành tựu cho người dùng",
      });
    }
  },
};

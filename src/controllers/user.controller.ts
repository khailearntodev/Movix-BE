import { Request, Response } from 'express';
import * as userService from '../services/user.service';
import * as subscriptionService from '../services/subscription.service';
import { getSystemRanks } from '../services/admin.gamification.service';

export const getMyProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.userId; 
    
    if (!userId) {
      return res.status(401).json({ message: 'Không thể xác định người dùng.' });
    }

    const userProfile = await userService.getProfile(userId);
    res.status(200).json(userProfile);
  } catch (error: any) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
};

export const getMySubscription = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Không thể xác định người dùng.' });
    }

    const subscription = await subscriptionService.getUserSubscription(userId);

    if (!subscription) {
      return res.status(200).json({
        message: 'Người dùng chưa có gói đăng ký.',
        data: null,
      });
    }

    return res.status(200).json({
      message: 'Lấy gói đăng ký hiện tại thành công.',
      data: subscription,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ nội bộ.' });
  }
};

export const updateMyProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { display_name, gender, avatar_url, display_name_color } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Không thể xác định người dùng.' });
    }
    
    const user = await userService.getUserById(userId);
    const ranksConfig = await getSystemRanks();

    if (avatar_url && avatar_url.toLowerCase().includes('.gif')) {
      if (user && ranksConfig && ranksConfig.EXPERT) {
        if (user.xp < ranksConfig.EXPERT.min_xp) {
          return res.status(403).json({ message: 'Bạn cần đạt hạng Phê Phim (Expert) để sử dụng ảnh đại diện động (GIF).' });
        }
      }
    }

    if (display_name_color && display_name_color.trim().length > 0) {
      if (user && ranksConfig && ranksConfig.MEMBER) {
        if (user.xp < ranksConfig.MEMBER.min_xp) {
          return res.status(403).json({ message: 'Bạn cần đạt hạng Cinephile (Member) để đổi màu tên hiển thị.' });
        }
      }
    }

    const updateData = {
      display_name,
      gender,
      avatar_url,
      display_name_color,
    };

    const updatedUser = await userService.updateProfile(userId, updateData);
    res.status(200).json({
      message: 'Cập nhật tài khoản thành công.',
      data: updatedUser,
    });
  } catch (error: any) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ.' });
  }
};
export const changeMyPassword = async (req: Request, res: Response) => {
  try {
    const userId = req.userId; 
    const { oldPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Chưa xác thực.' });
    }
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập đủ mật khẩu.' });
    }
    if (newPassword.length < 8) {
       return res.status(400).json({ message: 'Mật khẩu mới quá ngắn.' });
    }

    await userService.changePassword(userId, oldPassword, newPassword);
    res.status(200).json({ message: 'Đổi mật khẩu thành công.' });
  } catch (error: any) {
    if (error.message === 'INVALID_OLD_PASSWORD') {
      return res.status(400).json({ message: 'Mật khẩu cũ không đúng.' });
    }
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ.' });
  }
};

export const requestMySubscriptionRefund = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { reason, bank_name, account_number } = req.body as { reason?: string, bank_name?: string, account_number?: string };

    if (!userId) {
      return res.status(401).json({ message: 'Không thể xác định người dùng.' });
    }

    const result = await subscriptionService.requestRefundAndCancelSubscription(
      userId,
      reason,
      bank_name,
      account_number
    );

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({
      message: error.message || 'Không thể gửi yêu cầu hoàn tiền.',
    });
  }
};
export const getMyRefundRequests = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Không thể xác định người dùng.' });
    }
    const refundRequests = await subscriptionService.getMyRefundRequests(userId);
    return res.status(200).json({
      message: 'Lấy danh sách yêu cầu hoàn tiền thành công.',
      data: refundRequests,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Lỗi máy chủ nội bộ.',
    });
  }};

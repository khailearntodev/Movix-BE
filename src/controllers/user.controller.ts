import { Request, Response } from 'express';
import * as userService from '../services/user.service';


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
export const updateMyProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { display_name, gender, avatar_url } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Không thể xác định người dùng.' });
    }
    
    const updateData = {
      display_name,
      gender,
      avatar_url,
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
import { Request, Response } from 'express';
import * as authService from '../services/auth.service';

const REFRESH_TOKEN_EXPIRES_DAYS = 7;
const RESET_TOKEN_EXPIRATION_MINUTES = 15;

export const register = async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;
    const user = await authService.register(email, username, password);
    res.status(201).json({
      message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực.',
      data: user,
    });
  } catch (error: any) {
    if (error.message === 'Email hoặc username đã được sử dụng.') {
        return res.status(409).json({ 
            code: 'USER_ALREADY_EXISTS',
            message: error.message 
        });
    }
    res.status(400).json({ message: error.message });
  }
};

export const verify = async (req: Request, res: Response) => {
  try {
    const { email, verificationCode } = req.body;
    await authService.verifyEmail(email, verificationCode);
    res.status(200).json({
      message: 'Xác thực email thành công! Bạn có thể đăng nhập.',
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const authResponse: any = await authService.login(email, password);
    const { accessToken, refreshToken, ...userData } = authResponse;

    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, 
    });

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', 
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: 'Đăng nhập thành công!',
      data: authResponse, 
    });
  } catch (error: any) {
    if (error.message === 'EMAIL_NOT_VERIFIED') {
      return res.status(403).json({ 
        code: 'USER_NOT_VERIFIED', 
        message: 'Email chưa được xác thực. Vui lòng xác minh tài khoản.' 
      });
    }
    if (error.message === 'ACCOUNT_LOCKED') {
      return res.status(403).json({ 
        code: 'ACCOUNT_LOCKED', 
        message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.' 
      });
    }
    if (error.message === 'INVALID_CREDENTIALS') {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng.' });
    }
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ.' });
  }
};

export const resendVerification = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Email là bắt buộc.' });
    }

    await authService.resendVerification(email);
    res.status(200).json({
      message: 'Mã xác thực mới đã được gửi. Vui lòng kiểm tra email.',
    });
  } catch (error: any) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }
    if (error.message === 'ALREADY_VERIFIED') {
      return res.status(400).json({ message: 'Tài khoản này đã được xác thực.' });
    }
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ.' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email là bắt buộc.' });
    }
    await authService.requestPasswordReset(email);
    res.status(200).json({
      message: 'Link đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra email.',
    });
  } catch (error: any) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(4404).json({ message: 'Không tìm thấy người dùng.' });
    }
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ.' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ message: 'Token và mật khẩu mới là bắt buộc.' });
    }

    await authService.resetPassword(token, newPassword);
    res.status(200).json({
      message: 'Mật khẩu đã được đặt lại thành công.',
    });
  } catch (error: any) {
    if (
      error.message === 'TOKEN_NOT_FOUND' ||
      error.message === 'TOKEN_EXPIRED'
    ) {
      return res
        .status(400)
        .json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
    }
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ.' });
  }
};

export const logout = async (req: Request, res: Response) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (refreshToken) {
          await authService.logout(refreshToken);
        }
        
        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });
        
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax', 
        });

        res.status(200).json({ message: 'Đăng xuất thành công.' });
    } catch (error: any) {
        res.clearCookie('accessToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
        res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
        res.status(200).json({ message: 'Đăng xuất thành công.' });
    }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Không tìm thấy Refresh Token.' });
    }

    const newTokens = await authService.renewTokenOnly(refreshToken); 

    res.cookie('accessToken', newTokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: RESET_TOKEN_EXPIRATION_MINUTES * 60 * 1000, 
    });

    res.cookie('refreshToken', newTokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ message: 'Làm mới token thành công.' });

  } catch (error: any) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.status(403).json({ message: 'Refresh token không hợp lệ hoặc đã hết hạn.' });
  }
};
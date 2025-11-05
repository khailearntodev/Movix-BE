import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import * as emailService from './email.service'
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const OTP_EXPIRATION_MINUTES = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key';
const JWT_EXPIRES_IN = '1h';
const REFRESH_TOKEN_EXPIRES_DAYS = 7;
const RESET_TOKEN_EXPIRATION_MINUTES = 15;

// Hàm tạo OTP - CHo đăng ký và xác thực email
const generateOTP = () => crypto.randomInt(100000, 999999).toString();

const generateTokens = async (userId: string) => {
  // 1. Tạo Access Token
  const accessToken = jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  // 2. Tạo Refresh Token và lưu vào CSDL
  const refreshToken = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  );

  // Xóa token cũ nếu có và tạo token mới
  await prisma.refreshToken.deleteMany({
    where: { userId },
  });
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      expiresAt,
      userId,
    },
  });

  return { accessToken, refreshToken };
};

export const register = async (
  email: string,
  username: string,
  password: string,
) => {
  // 1. Kiểm tra user tồn tại
  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existingUser) {
    throw new Error('Email hoặc username đã được sử dụng.');
  }

  // 2. Hash mật khẩu
  const hashedPassword = await bcrypt.hash(password, 10);

  // 3. Lấy role "USER"
  const userRole = await prisma.role.findUnique({
    where: { name: 'User' },
  });
  if (!userRole) {
    throw new Error('Không tìm thấy vai trò USER. Vui lòng seed database.');
  }

  // 4. Tạo mã OTP và thời gian hết hạn
  const otp = generateOTP();
  const expires = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);

  // 5. Tạo user
  const user = await prisma.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
      display_name: username, 
      role_id: userRole.id,
      status: 'pending_verification',
      verificationCode: otp,
      verificationExpires: expires,
    },
  });

  // 6. Gửi email xác thực
  await emailService.sendVerificationEmail(user.email, otp, {
    name: user.display_name,
    expiresMinutes: OTP_EXPIRATION_MINUTES,
  });

  // 7. Trả về user
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

export const verifyEmail = async (email: string, otp: string) => {
  // 1. Tìm user
  const user = await prisma.user.findFirst({
    where: { email, status: 'pending_verification' },
  });

  if (!user) {
    throw new Error('Email không tồn tại hoặc đã được xác thực.');
  }

  // 2. Kiểm tra mã OTP
  if (
    !user.verificationCode ||
    !user.verificationExpires ||
    user.verificationCode !== otp
  ) {
    throw new Error('Mã OTP không hợp lệ.');
  }

  // 3. Kiểm tra OTP hết hạn
  if (user.verificationExpires < new Date()) {
    throw new Error('Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại.');
  }

  // 4. Kích hoạt tài khoản
  await prisma.user.update({
    where: { id: user.id },
    data: {
      status: 'active',
      verificationCode: null,
      verificationExpires: null,
    },
  });

  return true;
};

export const login = async (email: string, password: string) => {
  // 1. Tìm user
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      role: {
        select: { name: true }, 
      },
    },
  });

  if (!user) {
    throw new Error('INVALID_CREDENTIALS');
  }

  // 2. Kiểm tra trạng thái
  if (user.status !== 'active') {
    throw new Error('EMAIL_NOT_VERIFIED');
  }

  // 3. So sánh mật khẩu
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error('INVALID_CREDENTIALS');
  }

  // 4. Cập nhật last_login_at
  await prisma.user.update({
    where: { id: user.id },
    data: { last_login_at: new Date() },
  });

  // 5. Tạo tokens
  const tokens = await generateTokens(user.id);

  // 6. Trả về AuthResponse
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role?.name,
    ...tokens,
  };
};

export const resendVerification = async (email: string) => {
  // 1. Tìm user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  // 2. Kiểm tra nếu tài khoản đã active 
  if (user.status === 'active') {
    throw new Error('ALREADY_VERIFIED');
  }

  // 3. Tạo OTP mới và thời gian hết hạn mới
  const otp = generateOTP();
  const expires = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);

  // 4. Cập nhật user với mã OTP mới
  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationCode: otp,
      verificationExpires: expires,
    },
  });

  // 5. Gửi lại email (dùng lại email service)
  await emailService.sendVerificationEmail(user.email, otp, {
    name: user.display_name,
    expiresMinutes: OTP_EXPIRATION_MINUTES,
  });

  return true;
};

export const requestPasswordReset = async (email: string) => {
  // 1. Tìm user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.log(
      `Yêu cầu reset mật khẩu cho email không tồn tại: ${email}. Trả về thành công giả.`,
    );
    return true;
  }

  // 2. Tạo token mới
  const token = crypto.randomUUID(); 
  const expires = new Date(
    Date.now() + RESET_TOKEN_EXPIRATION_MINUTES * 60 * 1000,
  );

  // 3. Xóa BẤT KỲ token cũ nào của user này
  await prisma.passwordReset.deleteMany({
    where: { user_id: user.id },
  });

  // 4. Tạo token mới trong CSDL
  const resetRequest = await prisma.passwordReset.create({
    data: {
      user_id: user.id,
      reset_token: token,
      expires_at: expires,
    },
  });

  // 4. Gửi email
  await emailService.sendPasswordResetEmail(user.email, token, {
    name: user.display_name,
    expiresMinutes: RESET_TOKEN_EXPIRATION_MINUTES,
  });

  return true;
};

export const resetPassword = async (token: string, newPassword: string) => {
  // 1. Tìm token 
  const resetRequest = await prisma.passwordReset.findUnique({
    where: { reset_token: token },
  });

  if (!resetRequest) {
    throw new Error('TOKEN_NOT_FOUND');
  }

  // 2. Kiểm tra hết hạn
  if (resetRequest.expires_at < new Date()) {
    // Xóa token hết hạn
    await prisma.passwordReset.delete({ where: { id: resetRequest.id } });
    throw new Error('TOKEN_EXPIRED');
  }

  // 3. Hash mật khẩu mới
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // 4. Cập nhật mật khẩu user
  await prisma.user.update({
    where: { id: resetRequest.user_id },
    data: {
      password: hashedPassword,
    },
  });

  // 5. Xóa token đã sử dụng 
  await prisma.passwordReset.delete({
    where: { id: resetRequest.id },
  });

  return true;
};

export const logout = async (refreshToken: string) => {
  try {
    await prisma.refreshToken.delete({
      where: { token: refreshToken },
    });
  } catch (error) {
    console.warn(`Không tìm thấy refresh token để xóa: ${refreshToken}`);
  }
  return true;
};
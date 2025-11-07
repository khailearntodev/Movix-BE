import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 

  if (token == null) {
    return res.status(401).json({ message: 'Token là bắt buộc.' }); 
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: payload.userId, status: 'active' },
    });

    if (!user) {
      return res.status(403).json({ message: 'Token không hợp lệ hoặc người dùng không tồn tại.' }); 
    }
    req.userId = user.id;
    next();
  } catch (error) {
    console.error('Lỗi xác thực token:', error);
    return res.status(403).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
};
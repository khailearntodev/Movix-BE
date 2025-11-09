import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { renewAccessToken } from '../services/auth.service';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const RENEWAL_THRESHOLD = 300; // 5 phút

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // 1. LẤY TOKEN TỪ COOKIE
  let token = req.cookies.accessToken; 
  const refreshToken = req.cookies.refreshToken;

  if (token == null) {
    return res.status(401).json({ message: 'Token là bắt buộc.' }); 
  }

  try {
    // 2. XÁC MINH ACCESS TOKEN
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string, exp: number };
    req.userId = payload.userId;
    
    // 3. KIỂM TRA & LÀM MỚI TOKEN
    const timeRemaining = payload.exp * 1000 - Date.now();
    const shouldRenew = timeRemaining < RENEWAL_THRESHOLD * 1000;

    if (shouldRenew && refreshToken) {
        console.log("Access Token sắp hết hạn. Đang làm mới...");
        const newTokens = await renewAccessToken(payload.userId, refreshToken); 
        
        if (newTokens) {
             res.cookie('accessToken', newTokens.accessToken, {
                 httpOnly: true,
                 secure: process.env.NODE_ENV === 'production',
                 sameSite: 'lax',
                 maxAge: 15 * 60 * 1000, 
             });
             token = newTokens.accessToken; 
        }
    }

    next();
  } catch (error: any) {
    let expiredUserId = null;

    if (error.name === 'TokenExpiredError' && refreshToken) {
        try {
            const decodedExpired = jwt.decode(token) as { userId: string };
            expiredUserId = decodedExpired?.userId;
        } catch (decodeError) {
            console.error("Lỗi khi decode token hết hạn:", decodeError);
        }
    }
    if (refreshToken && expiredUserId) {
        try {
            const newTokens = await renewAccessToken(expiredUserId, refreshToken); 

            if (newTokens) {
                res.cookie('accessToken', newTokens.accessToken, {
                    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 15 * 60 * 1000,
                });
                res.cookie('refreshToken', newTokens.refreshToken, {
                    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000,
                });
                
                req.userId = expiredUserId; 
                
                return next();
            }

        } catch (renewError) {
            console.error("Làm mới token thất bại, buộc đăng xuất:", renewError);
        }
    }
    return res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
  }
};
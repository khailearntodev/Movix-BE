import { Request, Response } from 'express';
import * as adminUserService from '../services/admin.user.service';
import { prisma } from '../lib/prisma';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const take = parseInt(req.query.take as string) || 15;
    const search = (req.query.q as string) || '';
    const sortBy = (req.query.sortBy as string) || 'lastLoginDesc';
    const flaggedOnly = req.query.flagged === 'true';

    const result = await adminUserService.getAllUsers(page, take, search, sortBy, flaggedOnly);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách user' });
  }
};

export const getUserDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await adminUserService.getUserDetails(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy chi tiết user' });
  }
};

export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active', 'inactive', 'locked'
    const updated = await adminUserService.updateUserStatus(id, status);
    res.json({ message: 'Cập nhật trạng thái thành công', data: updated });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật user' });
  }
};

export const toggleFlag = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await adminUserService.toggleUserFlag(id);
    res.json({ 
      message: updated.is_flagged ? 'Đã gắn cờ tài khoản' : 'Đã bỏ gắn cờ', 
      isFlagged: updated.is_flagged 
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi thay đổi trạng thái cờ' });
  }
};

export const updateRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || (role !== 'Admin' && role !== 'User')) {
      return res.status(400).json({ message: 'Role không hợp lệ. Chỉ chấp nhận Admin hoặc User.' });
    }

    const updatedUser = await adminUserService.updateUserRole(id, role);
    
    res.json({ 
      message: `Đã cập nhật quyền thành công: ${updatedUser.role?.name}`, 
      data: updatedUser 
    });
  } catch (error: any) {
    if (error.message === 'ROLE_NOT_FOUND') {
      return res.status(404).json({ message: 'Không tìm thấy vai trò này trong hệ thống.' });
    }
    res.status(500).json({ message: 'Lỗi cập nhật quyền user' });
  }
};
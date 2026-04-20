import { Request, Response } from 'express';
import * as subscriptionPlanService from '../services/subscription-plan.service';

export const createSubscriptionPlan = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      price,
      currency,
      duration_days,
      level,
      benefits,
      can_create_watch_party,
      max_watch_party_participants,
      can_kick_mute_members,
    } = req.body;
    if (!name || !price || !duration_days) {
      return res.status(400).json({
        message: 'Vui lòng cung cấp đủ thông tin bắt buộc (name, price, duration_days).',
      });
    }

    if (price < 0) {
      return res.status(400).json({
        message: 'Giá phải là số dương.',
      });
    }

    if (duration_days <= 0) {
      return res.status(400).json({
        message: 'Số ngày phải lớn hơn 0.',
      });
    }

    const newPlan = await subscriptionPlanService.createSubscriptionPlan({
      name,
      description: description || null,
      price,
      currency: currency || 'VND',
      duration_days,
      level: level || 1,
      benefits: benefits || null,
      can_create_watch_party: can_create_watch_party || false,
      max_watch_party_participants: max_watch_party_participants || 0,
      can_kick_mute_members: can_kick_mute_members || false,
    });

    return res.status(201).json({
      message: 'Tạo gói đăng ký thành công.',
      data: newPlan,
    });
  } catch (error: any) {
    if (error.message === 'PLAN_NAME_ALREADY_EXISTS') {
      return res.status(409).json({
        message: 'Tên gói đăng ký đã tồn tại.',
      });
    }
    console.error('Error creating subscription plan:', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ nội bộ.',
    });
  }
};

export const getAllSubscriptionPlans = async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;

    const filters: { isActive?: boolean } = {};
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    const plans = await subscriptionPlanService.getAllSubscriptionPlans(filters);

    return res.status(200).json({
      message: 'Lấy danh sách gói đăng ký thành công.',
      data: plans,
      total: plans.length,
    });
  } catch (error: any) {
    console.error('Error fetching subscription plans:', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ nội bộ.',
    });
  }
};

export const getSubscriptionPlanById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const plan = await subscriptionPlanService.getSubscriptionPlanById(id);

    return res.status(200).json({
      message: 'Lấy chi tiết gói đăng ký thành công.',
      data: plan,
    });
  } catch (error: any) {
    if (error.message === 'PLAN_NOT_FOUND') {
      return res.status(404).json({
        message: 'Không tìm thấy gói đăng ký.',
      });
    }
    console.error('Error fetching subscription plan:', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ nội bộ.',
    });
  }
};

export const updateSubscriptionPlan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      currency,
      duration_days,
      level,
      benefits,
      can_create_watch_party,
      max_watch_party_participants,
      can_kick_mute_members,
      is_active,
    } = req.body;

    if (price !== undefined && price < 0) {
      return res.status(400).json({
        message: 'Giá phải là số dương.',
      });
    }

    if (duration_days !== undefined && duration_days <= 0) {
      return res.status(400).json({
        message: 'Số ngày phải lớn hơn 0.',
      });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (currency !== undefined) updateData.currency = currency;
    if (duration_days !== undefined) updateData.duration_days = duration_days;
    if (level !== undefined) updateData.level = level;
    if (benefits !== undefined) updateData.benefits = benefits;
    if (can_create_watch_party !== undefined)
      updateData.can_create_watch_party = can_create_watch_party;
    if (max_watch_party_participants !== undefined)
      updateData.max_watch_party_participants = max_watch_party_participants;
    if (can_kick_mute_members !== undefined)
      updateData.can_kick_mute_members = can_kick_mute_members;
    if (is_active !== undefined) updateData.is_active = is_active;

    const updatedPlan =
      await subscriptionPlanService.updateSubscriptionPlan(id, updateData);

    return res.status(200).json({
      message: 'Cập nhật gói đăng ký thành công.',
      data: updatedPlan,
    });
  } catch (error: any) {
    if (error.message === 'PLAN_NOT_FOUND') {
      return res.status(404).json({
        message: 'Không tìm thấy gói đăng ký.',
      });
    }
    if (error.message === 'PLAN_NAME_ALREADY_EXISTS') {
      return res.status(409).json({
        message: 'Tên gói đăng ký đã tồn tại.',
      });
    }
    console.error('Error updating subscription plan:', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ nội bộ.',
    });
  }
};


export const deleteSubscriptionPlan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deletedPlan = await subscriptionPlanService.deleteSubscriptionPlan(id);

    return res.status(200).json({
      message: 'Xóa gói đăng ký thành công.',
      data: deletedPlan,
    });
  } catch (error: any) {
    if (error.message === 'PLAN_NOT_FOUND') {
      return res.status(404).json({
        message: 'Không tìm thấy gói đăng ký.',
      });
    }
    if (error.message === 'CANNOT_DELETE_PLAN_IN_USE') {
      return res.status(409).json({
        message: 'Không thể xóa gói đăng ký đang được sử dụng.',
      });
    }
    console.error('Error deleting subscription plan:', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ nội bộ.',
    });
  }
};

export const deactivateSubscriptionPlan = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;

    const deactivatedPlan =
      await subscriptionPlanService.deactivateSubscriptionPlan(id);

    return res.status(200).json({
      message: 'Vô hiệu hóa gói đăng ký thành công.',
      data: deactivatedPlan,
    });
  } catch (error: any) {
    if (error.message === 'PLAN_NOT_FOUND') {
      return res.status(404).json({
        message: 'Không tìm thấy gói đăng ký.',
      });
    }
    console.error('Error deactivating subscription plan:', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ nội bộ.',
    });
  }
};


export const activateSubscriptionPlan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const activatedPlan =
      await subscriptionPlanService.activateSubscriptionPlan(id);

    return res.status(200).json({
      message: 'Kích hoạt gói đăng ký thành công.',
      data: activatedPlan,
    });
  } catch (error: any) {
    if (error.message === 'PLAN_NOT_FOUND') {
      return res.status(404).json({
        message: 'Không tìm thấy gói đăng ký.',
      });
    }
    console.error('Error activating subscription plan:', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ nội bộ.',
    });
  }
};


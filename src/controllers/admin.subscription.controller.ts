import { SubscriptionService } from "../services/admin.subscription.service";
import { Request, Response } from 'express';
import { SubscriptionStatus } from '@prisma/client';

export const getAllSubscriptions = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const take = parseInt(req.query.take as string) || 10;
        const statusFilter = req.query.status as SubscriptionStatus | undefined;
        const planIdFilter = req.query.planId as string | undefined;
        const result = await SubscriptionService.getAllSubscriptions(page, take, statusFilter, planIdFilter);
        res.status(200).json(result);
    } catch (error: any) {
        console.error('Error fetching subscriptions:', error);
        res
          .status(500)
          .json({ message: error.message || "Error fetching subscriptions" });
    }
};

export const updateSubscriptionStatus = async (req: Request, res: Response) => {
    try {
        const subscriptionId = req.params.id;
        const { status } = req.body as { status: SubscriptionStatus };
        const updatedSubscription = await SubscriptionService.updateSubscriptionStatus(subscriptionId, status);
        res.status(200).json(updatedSubscription);
    } catch (error: any) {
        console.error('Error updating subscription status:', error);
        res.status(500).json({ message: error.message || 'Error updating subscription status' });
    }
};

export const deleteSubscription = async (req: Request, res: Response) => {
    try {
        const subscriptionId = req.params.id;
        await SubscriptionService.deleteSubscription(subscriptionId);
        res.status(200).json({ message: 'Subscription deleted successfully' });
    }
    catch (error: any) {
        console.error('Error deleting subscription:', error);
        res.status(500).json({ message: error.message || 'Error deleting subscription' });
    }
};

export const toggleSubscriptionFlag = async (req: Request, res: Response) => {
    try {
        const subscriptionId = req.params.id;
        const updatedSubscription = await SubscriptionService.toggleSubscriptionFlag(subscriptionId);
        res.status(200).json(updatedSubscription);
    } catch (error: any) {
        console.error('Error toggling subscription flag:', error);
        res.status(500).json({ message: error.message || 'Error toggling subscription flag' });
    }
};

export const grantSubscription = async (req: Request, res: Response) => {
    try {
        const { userId, planId } = req.body as { userId: string, planId: string };
        const grantedSubscription = await SubscriptionService.grantSubscription(userId, planId);
        res.status(200).json(grantedSubscription);
    } catch (error: any) {
        console.error('Error granting subscription:', error);
        res.status(500).json({ message: error.message || 'Error granting subscription' });
    }
};

export const createSubscriptionPlan = async (req: Request, res: Response) => {
    try {
      const data = req.body;

      if (!data.name || data.price === undefined || !data.duration_days) {
        return res
          .status(400)
          .json({
            message: "Vui lòng điền đầy đủ Tên gói, Giá tiền và Số ngày!",
          });
      }

      const newPlan = await SubscriptionService.createPlan(data);
      res
        .status(201)
        .json(newPlan);
    } catch (error: any) {
      console.error("Error creating subscription plan:", error);
      res.status(500).json({ message: error.message || "Error creating subscription plan" });
    }
};

export const revokeSubscription = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body as { userId: string };
        if (!userId) {
             return res.status(400).json({ message: 'Vui lòng cung cấp userId' });
        }
        const revokedSubscription = await SubscriptionService.revokeSubscription(userId);
        res.status(200).json(revokedSubscription);
    } catch (error: any) {
        console.error('Error revoking subscription:', error);
        res.status(500).json({ message: error.message || 'Error revoking subscription' });
    }
};

export const getSubscriptionDetails = async (req: Request, res: Response) => {
    try {
        const subscriptionId = req.params.id;
        const subscription = await SubscriptionService.getSubscriptionDetails(subscriptionId);
        res.status(200).json(subscription);
    } catch (error: any) {
        console.error('Error fetching subscription details:', error);
        res.status(500).json({ message: error.message || 'Error fetching subscription details' });
    }
};

export const getAllSubscriptionPlans = async (req: Request, res: Response) => {
    try {
        const plans = await SubscriptionService.getAllSubscriptionPlans();
        res.status(200).json(plans);
    } catch (error: any) {
        console.error('Error fetching subscription plans:', error);
        res.status(500).json({ message: error.message || 'Error fetching subscription plans' });
    }
};

export const updateSubscriptionPlan = async (req: Request, res: Response) => {
    try {
        const planId = req.params.id;
        const data = req.body;
        const updatedPlan = await SubscriptionService.updateSubscriptionPlan(planId, data);
        res.status(200).json(updatedPlan);
    } catch (error: any) {
        console.error('Error updating subscription plan:', error);
        res.status(500).json({ message: error.message || 'Error updating subscription plan' });
    }
};
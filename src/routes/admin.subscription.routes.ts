import express from 'express';
import * as subscriptionController from '../controllers/admin.subscription.controller';

const router = express.Router();

// GET /api/admin/subscriptions/plans
router.get('/plans', subscriptionController.getAllSubscriptionPlans);

// GET /api/admin/subscriptions
router.get('/getAll', subscriptionController.getAllSubscriptions);

// POST /api/admin/subscriptions/grant
router.post('/grant', subscriptionController.grantSubscription);

// POST /api/admin/subscriptions/revoke
router.post('/revoke', subscriptionController.revokeSubscription);

// POST /api/admin/subscriptions/create-plan
router.post('/create-plan', subscriptionController.createSubscriptionPlan);

// POST /api/admin/subscriptions/update-status/:id
router.post("/update-status/:id", subscriptionController.updateSubscriptionStatus);

// DELETE /api/admin/subscriptions/:id
router.delete('/:id', subscriptionController.deleteSubscription);

// POST /api/admin/subscriptions/toggle-flag/:id
router.post('/toggle-flag/:id', subscriptionController.toggleSubscriptionFlag);

// GET /api/admin/subscriptions/:id
router.get('/:id', subscriptionController.getSubscriptionDetails);

// PUT /api/admin/subscriptions/update-plan/:id
router.put('/update-plan/:id', subscriptionController.updateSubscriptionPlan);

export default router;
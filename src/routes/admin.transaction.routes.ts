import express from 'express';
import * as transactionController from '../controllers/admin.transaction.controller';

const router = express.Router();

//Get /api/admin/transactions/get-all
router.get('/get-all', transactionController.getAllTransactions);

//Get /api/admin/transactions/get-by-id/:id
router.get('/get-by-id/:id', transactionController.getTransactionById);

//Post /api/admin/transactions/update-status/:id
router.patch('/update-status/:id', transactionController.updateTransactionStatus);

//GET /api/admin/transactions/get-stats
router.get('/get-stats', transactionController.getStats)

// GET /api/admin/transactions/refunds
router.get('/refunds', transactionController.getAllRefundRequests);

// POST /api/admin/transactions/refunds
router.post('/refunds', transactionController.createRefundRequest);

// PATCH /api/admin/transactions/refunds/:id/process
router.patch('/refunds/:id/process', transactionController.processRefundRequest);

export default router;
import * as transactionService from '../services/admin.transaction.service';
import { Request, Response } from 'express';

export const getAllTransactions = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const take = parseInt(req.query.take as string) || 15;
        const search = (req.query.q as string) || '';
        const filterStatus = (req.query.status as string) || 'ALL';
        const transactions = await transactionService.getAllTransactions(page, take, search, filterStatus);
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy danh sách giao dịch' });
    }
}

export const getTransactionById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const transaction = await transactionService.getTransactionById(id);
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
        res.json(transaction);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy chi tiết giao dịch' });
    }
}

export const updateTransactionStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const updated = await transactionService.updateTransactionStatus(id, status);
        res.json({ message: 'Cập nhật trạng thái thành công', data: updated });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi cập nhật trạng thái giao dịch' });
    }
}

export const getStats = async (req: Request, res: Response) => {
    try {
        const stats = await transactionService.getStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy thống kê' });
    }
}

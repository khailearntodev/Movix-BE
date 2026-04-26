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

export const getAllRefundRequests = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const take = parseInt(req.query.take as string) || 15;
        const filterStatus = (req.query.status as string) || 'ALL';
        
        const refundRequests = await transactionService.getAllRefundRequests(page, take, filterStatus);
        res.json(refundRequests);
    } catch (error) {
        console.error("Lỗi lấy danh sách hoàn tiền:", error);
        res.status(500).json({ message: 'Lỗi lấy danh sách hoàn tiền' });
    }
}

export const createRefundRequest = async (req: Request, res: Response) => {
    try {
        const { transactionId, reason } = req.body;
        
        if (!transactionId) {
            return res.status(400).json({ message: 'Thiếu transactionId' });
        }

        const refundRequest = await transactionService.createRefundRequest(transactionId, reason);
        res.status(201).json({ message: 'Tạo yêu cầu hoàn tiền thành công', data: refundRequest });
    } catch (error: any) {
        console.error("Lỗi tạo yêu cầu hoàn tiền:", error);
        res.status(400).json({ message: error.message || 'Lỗi khi tạo yêu cầu hoàn tiền' });
    }
}

export const processRefundRequest = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { action } = req.body; 

        if (!['APPROVE', 'REJECT'].includes(action)) {
            return res.status(400).json({ message: 'Hành động không hợp lệ. Vui lòng gửi APPROVE hoặc REJECT.' });
        }

        const processedRequest = await transactionService.processRefundRequest(id, action as 'APPROVE' | 'REJECT');
        res.json({ 
            message: `Đã ${action === 'APPROVE' ? 'chấp nhận' : 'từ chối'} yêu cầu hoàn tiền`, 
            data: processedRequest 
        });
    } catch (error: any) {
        console.error("Lỗi xử lý yêu cầu hoàn tiền:", error);
        res.status(400).json({ message: error.message || 'Lỗi khi xử lý yêu cầu hoàn tiền' });
    }
}

import { prisma } from '../lib/prisma';
import { Prisma, SubscriptionStatus, TransactionStatus } from "@prisma/client";


export const getAllTransactions = async (
    page: number,
    take: number,
    search: string,
    filterStatus: string
) => {
    const skip = (page - 1) * take;
    const where: Prisma.TransactionWhereInput = {};
    if (filterStatus && filterStatus !== 'ALL') {
        where.status = filterStatus as any;
    }

    if (search) {
        where.OR = [
            {
                transaction_ref: { contains: search, mode: 'insensitive' }
            },
            {
                user: {
                    email: { contains: search, mode: 'insensitive' }
                }
            },
            {
                user: {
                    display_name: { contains: search, mode: 'insensitive' },
                }
            },
            {
                user: {
                    username: { contains: search, mode: 'insensitive' }
                }
            }
        ]
    }

    const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
            take,
            skip,
            where,
            orderBy: {
                created_at: 'desc'
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        display_name: true,
                        username: true,
                        avatar_url: true,
                    }
                },
                plan: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        duration_days: true,
                    }
                }
            }
        }),
        prisma.transaction.count({ where })
    ]);

    return {
        data: transactions,
        meta: {
            total,
            page,
            lastPages: Math.ceil(total / take)
        }
    };
};

export const getTransactionById = async (id: string) => {
    const transaction = await prisma.transaction.findUnique({
        where: {
            id
        },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    display_name: true,
                    username: true,
                    avatar_url: true,
                }
            },
            plan: {
                select: {
                    id: true,
                    name: true,
                    price: true,
                    duration_days: true,
                }
            }
        }
    });
    if (!transaction) throw new Error("Transaction not found");
    return transaction;
};

export const updateTransactionStatus = async (id: string, status: TransactionStatus) => {
    const transaction = await prisma.transaction.findUnique({
        where: {
            id
        },
        include: {
            plan: true
        }
    });
    if (!transaction) throw new Error("Transaction not found");

    const updatedTransaction = await prisma.transaction.update({
        where: {
            id
        },
        data: {
            status: status
        }
    })

    if (status === TransactionStatus.COMPLETED && transaction.plan_id) {
        const durationDays = transaction.plan?.duration_days || 30;
        const now = new Date();

        let endDate = new Date();
        endDate.setDate(endDate.getDate() + durationDays);

        await prisma.userSubscription.upsert({
            where: {
                user_id: transaction.user_id
            },
            update: {
                plan_id: transaction.plan_id,
                status: SubscriptionStatus.ACTIVE,
                end_date: endDate,
                start_date: now,
            },
            create: {
                user_id: transaction.user_id,
                plan_id: transaction.plan_id,
                status: SubscriptionStatus.ACTIVE,
                start_date: now,
                end_date: endDate,
            },
        })
    } else if (status === TransactionStatus.REFUNDED) {
        await prisma.userSubscription.updateMany({
            where: {
                user_id: transaction.user_id
            },
            data: {
                status: SubscriptionStatus.CANCELLED,
            }
        });
    }

    return updatedTransaction;
};

export const getStats = async () => {
    const [revenueResult, pendingCount, refundCount] = await Promise.all([
        prisma.transaction.aggregate({
            where: {
                status: TransactionStatus.COMPLETED
            },
            _sum: {
                amount: true
            }
        }),
        prisma.transaction.count({
            where: {
                status: TransactionStatus.PENDING
            }
        }),
        prisma.transaction.count({
            where: {
                status: TransactionStatus.REFUNDED
            }
        }),
    ])

    return {
        revenue: revenueResult._sum.amount || 0,
        pending: pendingCount,
        refunded: refundCount,
    }
}

export const getAllRefundRequests = async (
    page: number,
    take: number,
    filterStatus: string
) => {
    const skip = (page - 1) * take;
    const where: Prisma.RefundRequestWhereInput = {};

    if (filterStatus && filterStatus !== 'ALL') {
        where.status = filterStatus as any;
    }

    const [requests, total] = await Promise.all([
        prisma.refundRequest.findMany({
            take,
            skip,
            where,
            orderBy: {
                created_at: 'desc'
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        display_name: true,
                        avatar_url: true,
                    }
                },
                transaction: {
                    select: {
                        id: true,
                        transaction_ref: true,
                        amount: true,
                        status: true,
                        created_at: true,
                    }
                }
            }
        }),
        prisma.refundRequest.count({ where })
    ]);

    return {
        data: requests,
        meta: {
            total,
            page,
            lastPages: Math.ceil(total / take)
        }
    };
};

export const createRefundRequest = async (transactionId: string, reason: string) => {
    const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId }
    });

    if (!transaction) throw new Error("Giao dịch không tồn tại");
    if (transaction.status !== TransactionStatus.COMPLETED) {
        throw new Error("Chỉ có thể tạo yêu cầu hoàn tiền cho giao dịch đã hoàn thành");
    }

    const existingRequest = await prisma.refundRequest.findFirst({
        where: {
            transaction_id: transactionId,
            status: {
                in: ['PENDING', 'APPROVED']
            }
        }
    });

    if (existingRequest) {
        throw new Error("Giao dịch này đã có yêu cầu hoàn tiền đang chờ hoặc đã được chấp nhận");
    }

    // Create the refund request
    const refundRequest = await prisma.refundRequest.create({
        data: {
            user_id: transaction.user_id,
            transaction_id: transactionId,
            reason: reason || "Yêu cầu hoàn tiền từ Admin"
        }
    });

    return refundRequest;
};

export const processRefundRequest = async (requestId: string, action: 'APPROVE' | 'REJECT') => {
    const refundRequest = await prisma.refundRequest.findUnique({
        where: { id: requestId },
        include: { transaction: true }
    });

    if (!refundRequest) throw new Error("Yêu cầu hoàn tiền không tồn tại");
    if (refundRequest.status !== 'PENDING') {
        throw new Error("Chỉ có thể xử lý yêu cầu đang ở trạng thái PENDING");
    }

    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const updatedRequest = await prisma.refundRequest.update({
        where: { id: requestId },
        data: { status: newStatus }
    });

    if (action === 'APPROVE') {
        await updateTransactionStatus(refundRequest.transaction_id, TransactionStatus.REFUNDED);
    }

    return updatedRequest;
};
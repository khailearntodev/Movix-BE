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
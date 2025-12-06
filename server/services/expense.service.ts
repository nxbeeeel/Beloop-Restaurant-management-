import { PrismaClient, PaymentMethod } from '@prisma/client';
import { TRPCError } from '@trpc/server';

export class ExpenseService {

    static async createExpense(prisma: PrismaClient, params: {
        outletId: string;
        staffId: string;
        date: Date;
        category: string;
        amount: number;
        paymentMethod: PaymentMethod;
        description?: string;
        receiptUrl?: string;
    }) {
        return prisma.$transaction(async (tx: any) => {
            // 1. Create Expense
            const expense = await tx.expense.create({
                data: {
                    outletId: params.outletId,
                    staffId: params.staffId,
                    date: params.date,
                    category: params.category,
                    amount: params.amount,
                    paymentMethod: params.paymentMethod,
                    description: params.description,
                    receiptUrl: params.receiptUrl,
                }
            });

            await this.refreshDailyAndMonthlyStats(tx, params.outletId, params.date);
            return expense;
        });
    }

    static async updateExpense(prisma: PrismaClient, params: {
        id: string;
        userId: string;
        role: string;
        category?: string;
        amount?: number;
        paymentMethod?: PaymentMethod;
        description?: string;
        receiptUrl?: string;
    }) {
        const expense = await prisma.expense.findUnique({ where: { id: params.id } });
        if (!expense) throw new TRPCError({ code: "NOT_FOUND" });

        // Permission Check (logic moved from router)
        const isManager = params.role === "OUTLET_MANAGER" || params.role === "BRAND_ADMIN" || params.role === "SUPER";
        const isOwner = expense.staffId === params.userId;

        if (!isManager && !isOwner) {
            throw new TRPCError({ code: "FORBIDDEN", message: "You can only edit your own expenses." });
        }

        return prisma.$transaction(async (tx: any) => {
            // 1. Update Expense
            const updatedExpense = await tx.expense.update({
                where: { id: params.id },
                data: {
                    category: params.category,
                    amount: params.amount,
                    paymentMethod: params.paymentMethod,
                    description: params.description,
                    receiptUrl: params.receiptUrl,
                }
            });

            await this.refreshDailyAndMonthlyStats(tx, expense.outletId, expense.date);
            return updatedExpense;
        });
    }

    static async deleteExpense(prisma: PrismaClient, params: {
        id: string;
        userId: string;
        role: string;
    }) {
        const expense = await prisma.expense.findUnique({ where: { id: params.id } });
        if (!expense) throw new TRPCError({ code: "NOT_FOUND" });

        const isManager = params.role === "OUTLET_MANAGER" || params.role === "BRAND_ADMIN" || params.role === "SUPER";
        const isOwner = expense.staffId === params.userId;

        if (!isManager && !isOwner) {
            throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete your own expenses." });
        }

        return prisma.$transaction(async (tx: any) => {
            await tx.expense.update({
                where: { id: params.id },
                data: { deletedAt: new Date() }
            });

            await this.refreshDailyAndMonthlyStats(tx, expense.outletId, expense.date);
            return { success: true };
        });
    }

    private static async refreshDailyAndMonthlyStats(tx: any, outletId: string, date: Date) {
        // 1. Recalculate Daily Totals
        const dayAgg = await tx.expense.aggregate({
            where: {
                outletId,
                date,
                deletedAt: null
            },
            _sum: { amount: true }
        });
        const totalDailyExpense = dayAgg._sum.amount?.toNumber() || 0;

        const sale = await tx.sale.findUnique({
            where: { outletId_date: { outletId, date } }
        });

        if (sale) {
            await tx.sale.update({
                where: { id: sale.id },
                data: {
                    totalExpense: totalDailyExpense,
                    profit: Number(sale.totalSale) - totalDailyExpense
                }
            });
        }

        // 2. Recalculate Monthly Totals
        const month = date.toISOString().slice(0, 7);
        const startOfMonth = new Date(`${month}-01`);
        const endOfMonth = new Date(startOfMonth);
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);

        const monthAgg = await tx.expense.aggregate({
            where: {
                outletId,
                date: {
                    gte: startOfMonth,
                    lt: endOfMonth
                },
                deletedAt: null
            },
            _sum: { amount: true }
        });
        const totalMonthExpense = monthAgg._sum.amount?.toNumber() || 0;

        const currentSummary = await tx.monthlySummary.findUnique({
            where: { outletId_month: { outletId, month } }
        });

        if (currentSummary) {
            await tx.monthlySummary.update({
                where: { id: currentSummary.id },
                data: {
                    totalExpenses: totalMonthExpense,
                    profit: Number(currentSummary.totalSales) - totalMonthExpense,
                    lastRefreshed: new Date()
                }
            });
        }
    }
}

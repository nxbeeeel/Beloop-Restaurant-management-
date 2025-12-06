import { PrismaClient } from '@prisma/client';

export class SaleService {
    /**
     * Records or updates a daily sale entry.
     * Handles aggregation of expenses and updating monthly summaries.
     */
    static async recordDailySale(prisma: PrismaClient, params: {
        outletId: string;
        date: Date;
        staffId: string;
        tenantId?: string;
        cashSale: number;
        bankSale: number;
        swiggy: number;
        zomato: number;
        swiggyPayout: number;
        zomatoPayout: number;
        otherOnline: number;
        otherOnlinePayout: number;
        cashInHand: number;
        cashInBank: number;
        cashWithdrawal: number;
    }) {
        const {
            outletId,
            date,
            staffId,
            tenantId,
            cashSale,
            bankSale,
            swiggy,
            zomato,
            swiggyPayout,
            zomatoPayout,
            otherOnline,
            otherOnlinePayout,
            cashInHand,
            cashInBank,
            cashWithdrawal
        } = params;

        const totalSale = cashSale + bankSale + swiggy + zomato + otherOnline;

        return prisma.$transaction(async (tx) => {
            // 1. Fetch existing expenses for this day
            const expenses = await tx.expense.aggregate({
                where: {
                    outletId,
                    date,
                    deletedAt: null
                },
                _sum: { amount: true }
            });

            const totalExpense = expenses._sum.amount?.toNumber() || 0;
            const profit = totalSale - totalExpense;

            // 2. Create or Update Sale record
            const sale = await tx.sale.upsert({
                where: {
                    outletId_date: {
                        outletId,
                        date
                    }
                },
                update: {
                    cashSale,
                    bankSale,
                    swiggy,
                    zomato,
                    swiggyPayout,
                    zomatoPayout,
                    otherOnline,
                    otherOnlinePayout,
                    cashInHand,
                    cashInBank,
                    cashWithdrawal,
                    totalSale: totalSale,
                    totalExpense,
                    profit,
                    staffId,
                    version: { increment: 1 }
                },
                create: {
                    outletId,
                    date,
                    staffId,
                    tenantId,
                    cashSale,
                    bankSale,
                    swiggy,
                    zomato,
                    swiggyPayout,
                    zomatoPayout,
                    otherOnline,
                    otherOnlinePayout,
                    cashInHand,
                    cashInBank,
                    cashWithdrawal,
                    totalSale: totalSale,
                    totalExpense,
                    profit,
                }
            });

            // 3. Update Monthly Summary
            await this.refreshMonthlySummary(tx, outletId, date, tenantId);

            return sale;
        });
    }

    /**
     * Records a daily closure from the POS.
     * Updates both DailyClosure and the main Sale record.
     */
    static async recordDailyClosure(prisma: PrismaClient, params: {
        tenantId: string;
        outletId: string;
        date: Date;
        cashSales: number;
        cardSales: number;
        upiSales?: number;
        totalSales: number;
    }) {
        const { tenantId, outletId, date, cashSales, cardSales, upiSales, totalSales } = params;
        const bankSale = cardSales + (upiSales || 0);

        return prisma.$transaction(async (tx) => {
            // 1. Upsert DailyClosure (Detailed Record)
            await tx.dailyClosure.upsert({
                where: {
                    outletId_date: {
                        outletId,
                        date
                    }
                },
                update: {
                    cashSale: cashSales,
                    bankSale: bankSale,
                    totalSale: totalSales,
                },
                create: {
                    outletId,
                    date,
                    cashSale: cashSales,
                    bankSale: bankSale,
                    totalSale: totalSales,
                    totalExpense: 0,
                    profit: totalSales
                }
            });

            // 2. Upsert Sale (Legacy/Main Record)
            const staff = await tx.user.findFirst({
                where: { outletId },
                select: { id: true }
            });

            if (staff) {
                await tx.sale.upsert({
                    where: {
                        outletId_date: {
                            outletId,
                            date
                        }
                    },
                    update: {
                        cashSale: cashSales,
                        bankSale: bankSale,
                        totalSale: totalSales,
                    },
                    create: {
                        outletId,
                        staffId: staff.id,
                        tenantId,
                        date,
                        cashSale: cashSales,
                        bankSale: bankSale,
                        totalSale: totalSales,
                        totalExpense: 0,
                        profit: totalSales
                    }
                });
            }

            // 3. Refresh Monthly Summary
            await this.refreshMonthlySummary(tx, outletId, date, tenantId);

            return { success: true };
        });
    }

    /**
     * Helper to refresh Monthly Summary Aggregations.
     * Can be called within a transaction context.
     */
    static async refreshMonthlySummary(tx: any, outletId: string, date: Date, tenantId?: string) {
        const month = date.toISOString().slice(0, 7); // "YYYY-MM"
        const startOfMonth = new Date(`${month}-01`);
        const endOfMonth = new Date(startOfMonth);
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);

        const monthAgg = await tx.sale.aggregate({
            where: {
                outletId,
                date: {
                    gte: startOfMonth,
                    lt: endOfMonth
                },
                deletedAt: null
            },
            _sum: {
                totalSale: true,
                totalExpense: true,
                profit: true,
                cashSale: true,
                bankSale: true
            }
        });

        await tx.monthlySummary.upsert({
            where: {
                outletId_month: {
                    outletId,
                    month
                }
            },
            update: {
                totalSales: monthAgg._sum.totalSale || 0,
                totalExpenses: monthAgg._sum.totalExpense || 0,
                netProfit: monthAgg._sum.profit || 0,
                cashSales: monthAgg._sum.cashSale || 0,
                bankSales: monthAgg._sum.bankSale || 0,
                lastRefreshed: new Date()
            },
            create: {
                outletId,
                month,
                tenantId,
                totalSales: monthAgg._sum.totalSale || 0,
                totalExpenses: monthAgg._sum.totalExpense || 0,
                netProfit: monthAgg._sum.profit || 0,
                cashSales: monthAgg._sum.cashSale || 0,
                bankSales: monthAgg._sum.bankSale || 0,
            }
        });
    }
}

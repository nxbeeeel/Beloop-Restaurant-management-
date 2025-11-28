import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const reportsRouter = router({
    getMonthlyReport: protectedProcedure
        .input(z.object({
            outletId: z.string().optional(),
            year: z.number(),
            month: z.number().min(1).max(12),
        }))
        .query(async ({ ctx, input }) => {
            const { outletId, year, month } = input;

            if (!ctx.tenantId) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'User is not associated with a tenant' });
            }

            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 1);

            // If outletId is provided, return specific outlet report
            if (outletId && outletId !== 'ALL') {
                const outlet = await ctx.prisma.outlet.findUnique({
                    where: { id: outletId },
                    select: { tenantId: true, name: true, code: true }
                });

                if (!outlet || outlet.tenantId !== ctx.tenantId) {
                    throw new TRPCError({ code: "FORBIDDEN" });
                }

                const summary = await ctx.prisma.monthlySummary.findUnique({
                    where: {
                        outletId_month: {
                            outletId,
                            month: `${year}-${month.toString().padStart(2, '0')}`,
                        }
                    }
                });

                const sales = await ctx.prisma.sale.findMany({
                    where: {
                        outletId,
                        date: { gte: startDate, lt: endDate }
                    },
                    orderBy: { date: 'asc' }
                });

                const expenses = await ctx.prisma.expense.findMany({
                    where: {
                        outletId,
                        date: { gte: startDate, lt: endDate }
                    },
                    include: {
                        staff: { select: { name: true, email: true } }
                    },
                    orderBy: { date: 'desc' }
                });

                return {
                    outlet: { name: outlet.name },
                    summary,
                    sales,
                    expenses: expenses.map(e => ({
                        ...e,
                        description: e.description || ''
                    })),
                };
            }

            // Aggregated Report for ALL Outlets
            const summaries = await ctx.prisma.monthlySummary.findMany({
                where: {
                    outlet: { tenantId: ctx.tenantId },
                    month: `${year}-${month.toString().padStart(2, '0')}`
                }
            });

            const aggregatedSummary = {
                totalSales: summaries.reduce((sum, s) => sum + Number(s.totalSales), 0),
                totalExpenses: summaries.reduce((sum, s) => sum + Number(s.totalExpenses), 0),
                netProfit: summaries.reduce((sum, s) => sum + Number(s.netProfit || 0), 0),
            };

            // Fetch recent expenses from all outlets
            const allExpenses = await ctx.prisma.expense.findMany({
                where: {
                    outlet: { tenantId: ctx.tenantId },
                    date: { gte: startDate, lt: endDate }
                },
                include: {
                    staff: { select: { name: true, email: true } },
                    outlet: { select: { name: true } }
                },
                orderBy: { date: 'desc' },
                take: 50
            });

            return {
                outlet: { name: "All Outlets" },
                summary: aggregatedSummary,
                sales: [],
                expenses: allExpenses.map(e => ({
                    ...e,
                    description: `[${e.outlet.name}] ${e.description || ''}`
                })),
            };
        }),

    getOutletComparison: protectedProcedure
        .input(z.object({
            year: z.number(),
            month: z.number().min(1).max(12),
        }))
        .query(async ({ ctx, input }) => {
            const { year, month } = input;
            const targetMonth = `${year}-${month.toString().padStart(2, '0')}`;

            const summaries = await ctx.prisma.monthlySummary.findMany({
                where: {
                    outlet: { tenantId: ctx.tenantId },
                    month: targetMonth
                },
                include: {
                    outlet: { select: { name: true } }
                }
            });

            return summaries.map(s => ({
                outletName: s.outlet.name,
                sales: Number(s.totalSales),
                expenses: Number(s.totalExpenses),
                profit: Number(s.netProfit || 0),
            })).sort((a, b) => b.sales - a.sales);
        }),

    getExpensesByCategory: protectedProcedure
        .input(z.object({
            outletId: z.string().optional(),
            year: z.number(),
            month: z.number().min(1).max(12),
        }))
        .query(async ({ ctx, input }) => {
            const { outletId, year, month } = input;

            const where: any = {
                tenantId: ctx.tenantId,
                date: {
                    gte: new Date(year, month - 1, 1),
                    lt: new Date(year, month, 1),
                }
            };

            if (outletId && outletId !== 'ALL') {
                where.outletId = outletId;
            }

            const expenses = await ctx.prisma.expense.findMany({
                where,
                select: {
                    category: true,
                    amount: true,
                }
            });

            const categoryTotals = expenses.reduce((acc: Record<string, number>, expense) => {
                const category = expense.category || 'Uncategorized';
                acc[category] = (acc[category] || 0) + Number(expense.amount);
                return acc;
            }, {});

            return Object.entries(categoryTotals)
                .map(([category, total]) => ({ category, total }))
                .sort((a, b) => (b.total as number) - (a.total as number));
        }),

    getSalesTrend: protectedProcedure
        .input(z.object({
            outletId: z.string().optional(),
            year: z.number(),
            month: z.number().min(1).max(12),
        }))
        .query(async ({ ctx, input }) => {
            const { outletId, year, month } = input;

            const where: any = {
                outlet: { tenantId: ctx.tenantId },
                date: {
                    gte: new Date(year, month - 1, 1),
                    lt: new Date(year, month, 1),
                }
            };

            if (outletId && outletId !== 'ALL') {
                where.outletId = outletId;
            }

            const sales = await ctx.prisma.sale.findMany({
                where,
                orderBy: { date: 'asc' },
                select: {
                    date: true,
                    totalSale: true,
                    cashSale: true,
                    bankSale: true,
                    swiggy: true,
                    zomato: true,
                }
            });

            // Aggregate by date if ALL outlets
            if (!outletId || outletId === 'ALL') {
                const aggregated: Record<string, any> = {};
                sales.forEach(sale => {
                    const dateStr = sale.date.toISOString().split('T')[0];
                    if (!aggregated[dateStr]) {
                        aggregated[dateStr] = {
                            date: dateStr,
                            total: 0, cash: 0, bank: 0, swiggy: 0, zomato: 0
                        };
                    }
                    aggregated[dateStr].total += Number(sale.totalSale);
                    aggregated[dateStr].cash += Number(sale.cashSale);
                    aggregated[dateStr].bank += Number(sale.bankSale);
                    aggregated[dateStr].swiggy += Number(sale.swiggy);
                    aggregated[dateStr].zomato += Number(sale.zomato);
                });
                return Object.values(aggregated).sort((a: any, b: any) => a.date.localeCompare(b.date));
            }

            return sales.map(sale => ({
                date: sale.date.toISOString().split('T')[0],
                total: Number(sale.totalSale),
                cash: Number(sale.cashSale),
                bank: Number(sale.bankSale),
                swiggy: Number(sale.swiggy),
                zomato: Number(sale.zomato),
            }));
        }),
});

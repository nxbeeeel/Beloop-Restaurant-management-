import { router, protectedProcedure } from "@/server/trpc/trpc";
import { enforceTenant } from "@/server/trpc/middleware/roleCheck";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const reportsRouter = router({
    getStats: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string().optional(),
            startDate: z.date(),
            endDate: z.date(),
        }))
        .query(async ({ ctx, input }) => {
            // Optimize: Get outlet IDs first to avoid join if querying all
            let outletIds: string[] = [];

            if (!ctx.tenantId) {
                return {
                    sales: 0,
                    orders: 0,
                    customers: 0,
                    avgOrderValue: 0,
                };
            }

            if (input.outletId && input.outletId !== 'ALL') {
                outletIds = [input.outletId];
            } else {
                const outlets = await ctx.prisma.outlet.findMany({
                    where: { tenantId: ctx.tenantId },
                    select: { id: true }
                });
                outletIds = outlets.map(o => o.id);
            }

            const where: any = {
                outletId: { in: outletIds },
                date: {
                    gte: input.startDate,
                    lte: input.endDate,
                },
                deletedAt: null,
            };

            const sales = await ctx.prisma.sale.findMany({
                where,
                select: {
                    totalSale: true,
                    date: true,
                }
            });

            const totalSales = sales.reduce((sum, s) => sum + Number(s.totalSale), 0);

            // Use Order model for more accurate counts if available
            const orderWhere: any = {
                outletId: { in: outletIds },
                createdAt: {
                    gte: input.startDate,
                    lte: input.endDate,
                },
                status: 'COMPLETED',
            };

            const orders = await ctx.prisma.order.findMany({
                where: orderWhere,
                select: {
                    totalAmount: true,
                    customerId: true,
                }
            });

            const orderCount = orders.length;
            const uniqueCustomers = new Set(orders.map(o => o.customerId).filter(Boolean)).size;
            const orderSales = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

            return {
                sales: orderSales, // Use Order table for real-time accuracy
                orders: orderCount,
                customers: uniqueCustomers,
                avgOrderValue: orderCount > 0 ? orderSales / orderCount : 0,
            };
        }),

    getSalesTrend: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string().optional(),
            startDate: z.date(),
            endDate: z.date(),
        }))
        .query(async ({ ctx, input }) => {
            let outletIds: string[] = [];

            if (!ctx.tenantId) return [];

            if (input.outletId && input.outletId !== 'ALL') {
                outletIds = [input.outletId];
            } else {
                const outlets = await ctx.prisma.outlet.findMany({
                    where: { tenantId: ctx.tenantId },
                    select: { id: true }
                });
                outletIds = outlets.map(o => o.id);
            }

            const where: any = {
                outletId: { in: outletIds },
                createdAt: {
                    gte: input.startDate,
                    lte: input.endDate,
                },
                status: 'COMPLETED',
            };

            const orders = await ctx.prisma.order.findMany({
                where,
                orderBy: { createdAt: 'asc' },
                select: {
                    createdAt: true,
                    totalAmount: true,
                }
            });

            // Aggregate by date
            const aggregated: Record<string, number> = {};
            orders.forEach(o => {
                const d = o.createdAt.toISOString().split('T')[0];
                aggregated[d] = (aggregated[d] || 0) + Number(o.totalAmount);
            });

            return Object.entries(aggregated).map(([date, amount]) => ({ date, amount }));
        }),

    getTopItems: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string().optional(),
            startDate: z.date(),
            endDate: z.date(),
            limit: z.number().default(5),
        }))
        .query(async ({ ctx, input }) => {
            let outletIds: string[] = [];

            if (!ctx.tenantId) return [];

            if (input.outletId && input.outletId !== 'ALL') {
                outletIds = [input.outletId];
            } else {
                const outlets = await ctx.prisma.outlet.findMany({
                    where: { tenantId: ctx.tenantId },
                    select: { id: true }
                });
                outletIds = outlets.map(o => o.id);
            }

            const where: any = {
                order: {
                    outletId: { in: outletIds },
                    createdAt: {
                        gte: input.startDate,
                        lte: input.endDate,
                    },
                    status: 'COMPLETED',
                }
            };

            // Group by product name
            const items = await ctx.prisma.orderItem.groupBy({
                by: ['name'],
                where,
                _sum: {
                    quantity: true,
                    total: true,
                },
                orderBy: {
                    _sum: {
                        total: 'desc',
                    }
                },
                take: input.limit,
            });

            return items.map(i => ({
                name: i.name,
                orders: i._sum.quantity || 0,
                revenue: Number(i._sum.total || 0),
            }));
        }),

    getPaymentMethods: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string().optional(),
            startDate: z.date(),
            endDate: z.date(),
        }))
        .query(async ({ ctx, input }) => {
            let outletIds: string[] = [];

            if (!ctx.tenantId) return [];

            if (input.outletId && input.outletId !== 'ALL') {
                outletIds = [input.outletId];
            } else {
                const outlets = await ctx.prisma.outlet.findMany({
                    where: { tenantId: ctx.tenantId },
                    select: { id: true }
                });
                outletIds = outlets.map(o => o.id);
            }

            const where: any = {
                outletId: { in: outletIds },
                createdAt: {
                    gte: input.startDate,
                    lte: input.endDate,
                },
                status: 'COMPLETED',
            };

            const orders = await ctx.prisma.order.findMany({
                where,
                select: {
                    paymentMethod: true,
                    totalAmount: true,
                }
            });

            const methodStats: Record<string, number> = {};
            let total = 0;

            orders.forEach(o => {
                const method = o.paymentMethod || 'UNKNOWN';
                const amount = Number(o.totalAmount);
                methodStats[method] = (methodStats[method] || 0) + amount;
                total += amount;
            });

            if (total === 0) return [];

            return Object.entries(methodStats)
                .map(([method, amount]) => ({
                    method,
                    amount,
                    percentage: Math.round((amount / total) * 100)
                }))
                .sort((a, b) => b.amount - a.amount);
        }),

    getMonthlySummary: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            month: z.string(), // Format: "YYYY-MM"
        }))
        .query(async ({ ctx, input }) => {
            if (!input.outletId) {
                return { totalSales: 0, totalExpenses: 0 };
            }

            // Parse month to get date range
            const [year, month] = input.month.split('-').map(Number);
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of month

            // Get total sales from Sale table
            const sales = await ctx.prisma.sale.aggregate({
                where: {
                    outletId: input.outletId,
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                    deletedAt: null,
                },
                _sum: {
                    totalSale: true,
                },
            });

            // Get total expenses
            const expenses = await ctx.prisma.expense.aggregate({
                where: {
                    outletId: input.outletId,
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                _sum: {
                    amount: true,
                },
            });

            return {
                totalSales: Number(sales._sum.totalSale || 0),
                totalExpenses: Number(expenses._sum.amount || 0),
            };
        }),
});

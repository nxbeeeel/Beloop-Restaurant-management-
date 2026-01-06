import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { enforceTenant } from "@/server/trpc/middleware/roleCheck";

export const dashboardRouter = router({
    getUser: protectedProcedure
        .query(async ({ ctx }) => {
            if (!ctx.user) return null;

            return ctx.prisma.user.findUnique({
                where: { id: ctx.user.id },
                include: {
                    tenant: {
                        include: {
                            outlets: {
                                select: {
                                    id: true,
                                    name: true,
                                    code: true,
                                    status: true
                                }
                            }
                        }
                    },
                    outlet: true
                }
            });
        }),

    getOutletStats: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ outletId: z.string() }))
        .query(async ({ ctx, input }) => {
            const currentMonth = new Date().toISOString().slice(0, 7);
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

            // Execute all queries in parallel for faster performance
            const [
                summary,
                recentSales,
                topItems,
                lowStockProductsCount,
                lowStockIngredientsCount,
                pendingSupplierPayments,
                todaySales
            ] = await Promise.all([
                // Monthly summary
                ctx.prisma.monthlySummary.findUnique({
                    where: {
                        outletId_month: {
                            outletId: input.outletId,
                            month: currentMonth
                        }
                    }
                }),

                // Recent sales (limit 5)
                ctx.prisma.sale.findMany({
                    where: { outletId: input.outletId, deletedAt: null },
                    orderBy: { date: 'desc' },
                    take: 5,
                    select: {
                        id: true,
                        date: true,
                        cashSale: true,
                        bankSale: true,
                        profit: true,
                        totalSale: true
                    }
                }),

                // Top items this month
                ctx.prisma.orderItem.groupBy({
                    by: ['name'],
                    where: {
                        order: {
                            outletId: input.outletId,
                            createdAt: { gte: startOfMonth }
                        }
                    },
                    _sum: {
                        quantity: true,
                        total: true
                    },
                    orderBy: {
                        _sum: {
                            quantity: 'desc'
                        }
                    },
                    take: 5
                }),

                // Low stock products count
                ctx.prisma.$queryRaw<{ count: bigint }[]>`
                    SELECT COUNT(*)::bigint as count
                    FROM "Product"
                    WHERE "outletId" = ${input.outletId}
                    AND "currentStock" <= "minStock"
                `,

                // Low stock ingredients count
                ctx.prisma.$queryRaw<{ count: bigint }[]>`
                    SELECT COUNT(*)::bigint as count
                    FROM "Ingredient"
                    WHERE "outletId" = ${input.outletId}
                    AND "stock" <= "minStock"
                `,

                // Pending supplier payments (suppliers with balance > 0)
                ctx.prisma.supplier.findMany({
                    where: {
                        outletId: input.outletId,
                        balance: { gt: 0 }
                    },
                    select: {
                        id: true,
                        name: true,
                        balance: true
                    },
                    orderBy: { balance: 'desc' },
                    take: 5
                }),

                // Today's sales total
                ctx.prisma.sale.aggregate({
                    where: {
                        outletId: input.outletId,
                        date: new Date(new Date().toISOString().split('T')[0]),
                        deletedAt: null
                    },
                    _sum: {
                        totalSale: true
                    }
                })
            ]);

            const lowStockProducts = Number(lowStockProductsCount[0]?.count || 0);
            const lowStockIngredients = Number(lowStockIngredientsCount[0]?.count || 0);

            // Calculate total pending to suppliers
            const totalPendingToSuppliers = pendingSupplierPayments.reduce(
                (sum, s) => sum + Number(s.balance), 0
            );

            // Today's sales
            const todaySalesTotal = Number(todaySales._sum.totalSale || 0);

            // Low sales warning (if today's sales < 20% of avg daily and after 2pm)
            const avgDailySales = Number(summary?.totalSales || 0) / Math.max(1, summary?.daysWithSales || 1);
            const isLowSales = todaySalesTotal < avgDailySales * 0.2 && new Date().getHours() > 14;

            return {
                summary,
                recentSales,
                topItems: topItems.map((item: { name: string; _sum: { quantity: number | null; total: number | null } }) => ({
                    name: item.name,
                    quantity: item._sum.quantity || 0,
                    revenue: item._sum.total || 0
                })),
                alerts: {
                    lowStockProducts,
                    lowStockIngredients,
                    totalPendingToSuppliers,
                    pendingSupplierPayments: pendingSupplierPayments.map(s => ({
                        id: s.id,
                        name: s.name,
                        balance: Number(s.balance)
                    })),
                    todaySales: todaySalesTotal,
                    isLowSales,
                    avgDailySales
                }
            };
        }),
});

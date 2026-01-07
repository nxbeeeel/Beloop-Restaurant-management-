import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { enforceTenant } from "@/server/trpc/middleware/roleCheck";
import { getOrSet, CacheKeys, CacheTTL, invalidateDashboard } from "@/lib/cache";

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
            // ⚡ ZERO-LAG: Cache stats for 5 minutes
            return getOrSet(
                CacheKeys.dashboardStats(input.outletId),
                async () => {
                    const currentMonth = new Date().toISOString().slice(0, 7);
                    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

                    // Execute all queries in parallel for faster performance
                    const [
                        summary,
                        recentSales,
                        topItems,
                        lowStockProductsCount,
                        lowStockIngredientsCount,
                        _supplierPaymentsPlaceholder,
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

                        // V2 TODO: Pending supplier payments - Supplier model needs balance field
                        // For now, return empty array
                        Promise.resolve([]),

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

                    // V2 TODO: Calculate pending to suppliers once balance field exists
                    const pendingSupplierPayments: { id: string; name: string; balance: number }[] = [];
                    const totalPendingToSuppliers = 0;

                    // Today's sales
                    const todaySalesTotal = Number(todaySales._sum.totalSale || 0);

                    // Low sales warning (if today's sales < 20% of avg daily and after 2pm)
                    const avgDailySales = Number(summary?.totalSales || 0) / Math.max(1, summary?.daysWithSales || 1);
                    const isLowSales = todaySalesTotal < avgDailySales * 0.2 && new Date().getHours() > 14;

                    return {
                        summary,
                        recentSales,
                        topItems: topItems.map((item) => ({
                            name: item.name,
                            quantity: item._sum.quantity || 0,
                            revenue: Number(item._sum.total) || 0
                        })),
                        alerts: {
                            lowStockProducts,
                            lowStockIngredients,
                            totalPendingToSuppliers,
                            pendingSupplierPayments,
                            todaySales: todaySalesTotal,
                            isLowSales,
                            avgDailySales
                        }
                    };
                },
                CacheTTL.SHORT // 5 minutes cache
            );
        }),
});

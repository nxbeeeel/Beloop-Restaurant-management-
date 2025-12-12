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
                lowStockIngredientsCount
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
                `
            ]);

            const lowStockProducts = Number(lowStockProductsCount[0]?.count || 0);
            const lowStockIngredients = Number(lowStockIngredientsCount[0]?.count || 0);

            return {
                summary,
                recentSales,
                topItems: topItems.map((item: any) => ({
                    name: item.name,
                    quantity: item._sum.quantity || 0,
                    revenue: item._sum.total || 0
                })),
                alerts: {
                    lowStockProducts,
                    lowStockIngredients
                }
            };
        }),
});

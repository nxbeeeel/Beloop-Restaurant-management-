import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { enforceTenant } from "../middleware/roleCheck";

export const dashboardRouter = router({
    getUser: protectedProcedure
        .query(async ({ ctx }) => {
            if (!ctx.user) return null;

            return ctx.prisma.user.findUnique({
                where: { id: ctx.user.id },
                include: {
                    tenant: {
                        include: {
                            outlets: true
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

            const summary = await ctx.prisma.monthlySummary.findUnique({
                where: {
                    outletId_month: {
                        outletId: input.outletId,
                        month: currentMonth
                    }
                }
            });

            // Get recent sales
            const recentSales = await ctx.prisma.sale.findMany({
                where: { outletId: input.outletId, deletedAt: null },
                orderBy: { date: 'desc' },
                take: 5
            });

            // Get Top Items (by quantity) - This month
            // Note: Prisma groupBy doesn't support joining easily, so we might need raw query or just fetch recent orders
            // For simplicity/performance, let's just count from OrderItems created this month
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

            const topItems = await ctx.prisma.orderItem.groupBy({
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
            });

            // Low Stock Alerts
            // We use $queryRaw because comparing two columns (stock <= minStock) is not directly supported in Prisma's where clause
            const lowStockProductsCount = await ctx.prisma.$queryRaw<{ count: bigint }[]>`
                SELECT COUNT(*)::bigint as count
                FROM "Product"
                WHERE "outletId" = ${input.outletId}
                AND "currentStock" <= "minStock"
            `;

            const lowStockIngredientsCount = await ctx.prisma.$queryRaw<{ count: bigint }[]>`
                SELECT COUNT(*)::bigint as count
                FROM "Ingredient"
                WHERE "outletId" = ${input.outletId}
                AND "stock" <= "minStock"
            `;

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

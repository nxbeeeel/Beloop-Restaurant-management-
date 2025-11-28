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

            return {
                summary,
                recentSales
            };
        }),
});

import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { enforceTenant } from "@/server/trpc/middleware/roleCheck";

export const ledgerRouter = router({
    getAccounts: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ outletId: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.financialAccount.findMany({
                where: { outletId: input.outletId },
                orderBy: { code: 'asc' }
            });
        }),

    getJournal: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            startDate: z.date().optional(),
            endDate: z.date().optional(),
        }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.journalEntry.findMany({
                where: {
                    outletId: input.outletId,
                    date: {
                        gte: input.startDate,
                        lte: input.endDate
                    }
                },
                include: {
                    lines: {
                        include: { account: true }
                    }
                },
                orderBy: { date: 'desc' }
            });
        }),

    getLedger: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            accountId: z.string()
        }))
        .query(async ({ ctx, input }) => {
            const account = await ctx.prisma.financialAccount.findUnique({
                where: { id: input.accountId }
            });

            const lines = await ctx.prisma.journalLine.findMany({
                where: {
                    accountId: input.accountId
                },
                include: {
                    journal: true
                },
                orderBy: { journal: { date: 'desc' } }
            });

            return { account, lines };
        })
});

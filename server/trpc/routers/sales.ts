import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { enforceTenant } from "../middleware/roleCheck";

export const salesRouter = router({
    // Check if a sale already exists for this outlet and date
    checkDuplicate: protectedProcedure
        .use(enforceTenant)
        .input(
            z.object({
                outletId: z.string(),
                date: z.date(),
            })
        )
        .query(async ({ ctx, input }) => {
            const existing = await ctx.prisma.sale.findUnique({
                where: {
                    outletId_date: {
                        outletId: input.outletId,
                        date: input.date
                    }
                },
                select: {
                    id: true,
                    totalSale: true,
                    staff: {
                        select: { name: true }
                    },
                    createdAt: true,
                }
            });

            return {
                exists: !!existing,
                data: existing
            };
        }),

    create: protectedProcedure
        .use(enforceTenant)
        .input(
            z.object({
                outletId: z.string(),
                date: z.date(), // Client should send Date object
                cashSale: z.number().min(0),
                bankSale: z.number().min(0),
                swiggy: z.number().min(0),
                zomato: z.number().min(0),
                swiggyPayout: z.number().min(0),
                zomatoPayout: z.number().min(0),
                otherOnline: z.number().min(0).default(0),
                otherOnlinePayout: z.number().min(0).default(0),
                cashInHand: z.number().min(0),
                cashInBank: z.number().min(0),
                cashWithdrawal: z.number().min(0),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { SaleService } = await import("../../services/sale.service");
            return SaleService.recordDailySale(ctx.prisma, {
                staffId: ctx.user.id,
                tenantId: ctx.user.tenantId || undefined,
                ...input
            });
        }),

    getDaily: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ outletId: z.string(), date: z.date() }))
        .query(async ({ ctx, input }) => {
            return await ctx.prisma.sale.findUnique({
                where: {
                    outletId_date: {
                        outletId: input.outletId,
                        date: input.date
                    }
                },
                include: {
                    staff: {
                        select: { name: true }
                    }
                }
            });
        }),

    list: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            startDate: z.date(),
            endDate: z.date()
        }))
        .query(async ({ ctx, input }) => {
            return await ctx.prisma.sale.findMany({
                where: {
                    outletId: input.outletId,
                    date: {
                        gte: input.startDate,
                        lte: input.endDate
                    },
                    deletedAt: null
                },
                orderBy: { date: 'desc' },
                include: {
                    staff: {
                        select: { name: true }
                    }
                }
            });
        }),

    getMonthly: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ outletId: z.string(), month: z.string() })) // month in "YYYY-MM"
        .query(async ({ ctx, input }) => {
            const startDate = new Date(`${input.month}-01`);
            const endDate = new Date(new Date(startDate).setMonth(startDate.getMonth() + 1));

            return await ctx.prisma.sale.findMany({
                where: {
                    outletId: input.outletId,
                    date: {
                        gte: startDate,
                        lt: endDate
                    },
                    deletedAt: null
                },
                orderBy: { date: 'desc' }
            });
        }),
});

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
            // 1. Calculate totals
            const totalSale = input.cashSale + input.bankSale + input.swiggy + input.zomato + input.otherOnline;

            // Fetch existing expenses for this day to calculate totals correctly
            const expenses = await ctx.prisma.expense.aggregate({
                where: {
                    outletId: input.outletId,
                    date: input.date,
                    deletedAt: null
                },
                _sum: {
                    amount: true
                }
            });

            const totalExpense = expenses._sum.amount?.toNumber() || 0;
            const profit = totalSale - totalExpense;

            return await ctx.prisma.$transaction(async (tx: any) => {
                // Create or Update Sale record
                const sale = await tx.sale.upsert({
                    where: {
                        outletId_date: {
                            outletId: input.outletId,
                            date: input.date
                        }
                    },
                    update: {
                        cashSale: input.cashSale,
                        bankSale: input.bankSale,
                        swiggy: input.swiggy,
                        zomato: input.zomato,
                        swiggyPayout: input.swiggyPayout,
                        zomatoPayout: input.zomatoPayout,
                        otherOnline: input.otherOnline,
                        otherOnlinePayout: input.otherOnlinePayout,
                        cashInHand: input.cashInHand,
                        cashInBank: input.cashInBank,
                        cashWithdrawal: input.cashWithdrawal,
                        totalSale,
                        totalExpense, // Update this based on current expenses
                        profit,
                        staffId: ctx.user.id,
                        version: { increment: 1 }
                    },
                    create: {
                        outletId: input.outletId,
                        date: input.date,
                        staffId: ctx.user.id,
                        cashSale: input.cashSale,
                        bankSale: input.bankSale,
                        swiggy: input.swiggy,
                        zomato: input.zomato,
                        swiggyPayout: input.swiggyPayout,
                        zomatoPayout: input.zomatoPayout,
                        otherOnline: input.otherOnline,
                        otherOnlinePayout: input.otherOnlinePayout,
                        cashInHand: input.cashInHand,
                        cashInBank: input.cashInBank,
                        cashWithdrawal: input.cashWithdrawal,
                        totalSale,
                        totalExpense,
                        profit,
                    }
                });

                // Update Monthly Summary
                const month = input.date.toISOString().slice(0, 7); // "YYYY-MM"

                // We need to re-aggregate for the month to be accurate
                const startOfMonth = new Date(`${month}-01`);
                const endOfMonth = new Date(startOfMonth);
                endOfMonth.setMonth(endOfMonth.getMonth() + 1);

                const monthAgg = await tx.sale.aggregate({
                    where: {
                        outletId: input.outletId,
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
                            outletId: input.outletId,
                            month
                        }
                    },
                    update: {
                        totalSales: monthAgg._sum.totalSale || 0,
                        totalExpenses: monthAgg._sum.totalExpense || 0,
                        profit: monthAgg._sum.profit || 0,
                        cashSales: monthAgg._sum.cashSale || 0,
                        bankSales: monthAgg._sum.bankSale || 0,
                        lastRefreshed: new Date()
                    },
                    create: {
                        outletId: input.outletId,
                        month,
                        totalSales: monthAgg._sum.totalSale || 0,
                        totalExpenses: monthAgg._sum.totalExpense || 0,
                        profit: monthAgg._sum.profit || 0,
                        cashSales: monthAgg._sum.cashSale || 0,
                        bankSales: monthAgg._sum.bankSale || 0,
                    }
                });

                return sale;
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

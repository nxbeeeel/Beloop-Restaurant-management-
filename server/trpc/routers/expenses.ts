import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { enforceTenant } from "../middleware/roleCheck";
import { PaymentMethod } from "@prisma/client";

export const expensesRouter = router({
    create: protectedProcedure
        .use(enforceTenant)
        .input(
            z.object({
                outletId: z.string(),
                date: z.date(),
                category: z.string(),
                amount: z.number().min(0),
                paymentMethod: z.nativeEnum(PaymentMethod),
                description: z.string().optional(),
                receiptUrl: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            return await ctx.prisma.$transaction(async (tx: any) => {
                // 1. Create Expense
                const expense = await tx.expense.create({
                    data: {
                        outletId: input.outletId,
                        staffId: ctx.user.id,
                        date: input.date,
                        category: input.category,
                        amount: input.amount,
                        paymentMethod: input.paymentMethod,
                        description: input.description,
                        receiptUrl: input.receiptUrl,
                    }
                });

                // 2. Update Daily Sale totals (if exists)
                // We need to update the `totalExpense` and `profit` on the Sale record for this day
                const dayAgg = await tx.expense.aggregate({
                    where: {
                        outletId: input.outletId,
                        date: input.date,
                        deletedAt: null
                    },
                    _sum: { amount: true }
                });

                const totalDailyExpense = dayAgg._sum.amount?.toNumber() || 0;

                const sale = await tx.sale.findUnique({
                    where: {
                        outletId_date: {
                            outletId: input.outletId,
                            date: input.date
                        }
                    }
                });

                if (sale) {
                    await tx.sale.update({
                        where: { id: sale.id },
                        data: {
                            totalExpense: totalDailyExpense,
                            profit: Number(sale.totalSale) - totalDailyExpense
                        }
                    });
                }

                // 3. Update Monthly Summary
                const month = input.date.toISOString().slice(0, 7);
                const startOfMonth = new Date(`${month}-01`);
                const endOfMonth = new Date(startOfMonth);
                endOfMonth.setMonth(endOfMonth.getMonth() + 1);

                const monthAgg = await tx.expense.aggregate({
                    where: {
                        outletId: input.outletId,
                        date: {
                            gte: startOfMonth,
                            lt: endOfMonth
                        },
                        deletedAt: null
                    },
                    _sum: { amount: true }
                });

                // We also need total sales for the month to update profit correctly in summary
                // Or we just update totalExpenses and re-calc profit
                const currentSummary = await tx.monthlySummary.findUnique({
                    where: { outletId_month: { outletId: input.outletId, month } }
                });

                const totalMonthExpense = monthAgg._sum.amount?.toNumber() || 0;
                const totalMonthSale = currentSummary?.totalSales.toNumber() || 0;

                await tx.monthlySummary.upsert({
                    where: {
                        outletId_month: {
                            outletId: input.outletId,
                            month
                        }
                    },
                    update: {
                        totalExpenses: totalMonthExpense,
                        netProfit: totalMonthSale - totalMonthExpense,
                        lastRefreshed: new Date()
                    },
                    create: {
                        outletId: input.outletId,
                        month,
                        totalSales: 0,
                        totalExpenses: totalMonthExpense,
                        netProfit: -totalMonthExpense,
                    }
                });

                return expense;
            });
        }),

    list: protectedProcedure
        .use(enforceTenant)
        .input(
            z.object({
                outletId: z.string(),
                startDate: z.date().optional(),
                endDate: z.date().optional(),
                category: z.string().optional(),
            })
        )
        .query(async ({ ctx, input }) => {
            return await ctx.prisma.expense.findMany({
                where: {
                    outletId: input.outletId,
                    deletedAt: null,
                    date: {
                        gte: input.startDate,
                        lte: input.endDate
                    },
                    category: input.category as any
                },
                orderBy: { date: 'desc' },
                include: {
                    staff: { select: { name: true } }
                }
            });
        }),

    update: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            id: z.string(),
            category: z.string().optional(),
            amount: z.number().min(0).optional(),
            paymentMethod: z.nativeEnum(PaymentMethod).optional(),
            description: z.string().optional(),
            receiptUrl: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const expense = await ctx.prisma.expense.findUnique({ where: { id: input.id } });
            if (!expense) throw new TRPCError({ code: "NOT_FOUND" });

            // Permission Check
            const isManager = ctx.role === "OUTLET_MANAGER" || ctx.role === "BRAND_ADMIN" || ctx.role === "SUPER";
            const isOwner = expense.staffId === ctx.user.id;

            if (!isManager && !isOwner) {
                throw new TRPCError({ code: "FORBIDDEN", message: "You can only edit your own expenses." });
            }

            return await ctx.prisma.$transaction(async (tx: any) => {
                // 1. Update Expense
                const updatedExpense = await tx.expense.update({
                    where: { id: input.id },
                    data: {
                        category: input.category,
                        amount: input.amount,
                        paymentMethod: input.paymentMethod,
                        description: input.description,
                        receiptUrl: input.receiptUrl,
                    }
                });

                // 2. Recalculate Daily Totals
                const dayAgg = await tx.expense.aggregate({
                    where: {
                        outletId: expense.outletId,
                        date: expense.date,
                        deletedAt: null
                    },
                    _sum: { amount: true }
                });
                const totalDailyExpense = dayAgg._sum.amount?.toNumber() || 0;

                const sale = await tx.sale.findUnique({
                    where: { outletId_date: { outletId: expense.outletId, date: expense.date } }
                });

                if (sale) {
                    await tx.sale.update({
                        where: { id: sale.id },
                        data: {
                            totalExpense: totalDailyExpense,
                            profit: Number(sale.totalSale) - totalDailyExpense
                        }
                    });
                }

                // 3. Recalculate Monthly Totals
                const month = expense.date.toISOString().slice(0, 7);
                const startOfMonth = new Date(`${month}-01`);
                const endOfMonth = new Date(startOfMonth);
                endOfMonth.setMonth(endOfMonth.getMonth() + 1);

                const monthAgg = await tx.expense.aggregate({
                    where: {
                        outletId: expense.outletId,
                        date: {
                            gte: startOfMonth,
                            lt: endOfMonth
                        },
                        deletedAt: null
                    },
                    _sum: { amount: true }
                });
                const totalMonthExpense = monthAgg._sum.amount?.toNumber() || 0;

                const currentSummary = await tx.monthlySummary.findUnique({
                    where: { outletId_month: { outletId: expense.outletId, month } }
                });

                if (currentSummary) {
                    await tx.monthlySummary.update({
                        where: { id: currentSummary.id },
                        data: {
                            totalExpenses: totalMonthExpense,
                            profit: Number(currentSummary.totalSales) - totalMonthExpense,
                            lastRefreshed: new Date()
                        }
                    });
                }

                return updatedExpense;
            });
        }),

    delete: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const expense = await ctx.prisma.expense.findUnique({ where: { id: input.id } });
            if (!expense) throw new TRPCError({ code: "NOT_FOUND" });

            // Permission Check
            const isManager = ctx.role === "OUTLET_MANAGER" || ctx.role === "BRAND_ADMIN" || ctx.role === "SUPER";
            const isOwner = expense.staffId === ctx.user.id;

            if (!isManager && !isOwner) {
                throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete your own expenses." });
            }

            return await ctx.prisma.$transaction(async (tx: any) => {
                // 1. Soft Delete
                await tx.expense.update({
                    where: { id: input.id },
                    data: { deletedAt: new Date() }
                });

                // 2. Recalculate Daily Totals
                const dayAgg = await tx.expense.aggregate({
                    where: {
                        outletId: expense.outletId,
                        date: expense.date,
                        deletedAt: null
                    },
                    _sum: { amount: true }
                });
                const totalDailyExpense = dayAgg._sum.amount?.toNumber() || 0;

                const sale = await tx.sale.findUnique({
                    where: { outletId_date: { outletId: expense.outletId, date: expense.date } }
                });

                if (sale) {
                    await tx.sale.update({
                        where: { id: sale.id },
                        data: {
                            totalExpense: totalDailyExpense,
                            profit: Number(sale.totalSale) - totalDailyExpense
                        }
                    });
                }

                // 3. Recalculate Monthly Totals
                const month = expense.date.toISOString().slice(0, 7);
                const startOfMonth = new Date(`${month}-01`);
                const endOfMonth = new Date(startOfMonth);
                endOfMonth.setMonth(endOfMonth.getMonth() + 1);

                const monthAgg = await tx.expense.aggregate({
                    where: {
                        outletId: expense.outletId,
                        date: {
                            gte: startOfMonth,
                            lt: endOfMonth
                        },
                        deletedAt: null
                    },
                    _sum: { amount: true }
                });
                const totalMonthExpense = monthAgg._sum.amount?.toNumber() || 0;

                const currentSummary = await tx.monthlySummary.findUnique({
                    where: { outletId_month: { outletId: expense.outletId, month } }
                });

                if (currentSummary) {
                    await tx.monthlySummary.update({
                        where: { id: currentSummary.id },
                        data: {
                            totalExpenses: totalMonthExpense,
                            profit: Number(currentSummary.totalSales) - totalMonthExpense,
                            lastRefreshed: new Date()
                        }
                    });
                }

                return { success: true };
            });
        })
});

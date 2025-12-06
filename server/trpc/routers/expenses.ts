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
            const { ExpenseService } = await import("../../services/expense.service");
            return ExpenseService.createExpense(ctx.prisma, {
                outletId: input.outletId,
                staffId: ctx.user.id,
                date: input.date,
                category: input.category,
                amount: input.amount,
                paymentMethod: input.paymentMethod,
                description: input.description,
                receiptUrl: input.receiptUrl,
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
            const { ExpenseService } = await import("../../services/expense.service");
            return ExpenseService.updateExpense(ctx.prisma, {
                userId: ctx.user.id,
                role: ctx.user.role || 'STAFF',
                ...input
            });
        }),

    delete: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const { ExpenseService } = await import("../../services/expense.service");
            return ExpenseService.deleteExpense(ctx.prisma, {
                id: input.id,
                userId: ctx.user.id,
                role: ctx.user.role || 'STAFF'
            });
        })
});

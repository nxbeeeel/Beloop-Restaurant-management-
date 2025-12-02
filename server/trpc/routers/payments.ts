import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { enforceTenant } from "../middleware/roleCheck";
import { TRPCError } from "@trpc/server";

export const paymentsRouter = router({
    create: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            supplierId: z.string(),
            amount: z.number().min(0.01),
            date: z.date(),
            method: z.string(),
            reference: z.string().optional(),
            notes: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.supplierPayment.create({
                data: {
                    outletId: input.outletId,
                    supplierId: input.supplierId,
                    amount: input.amount,
                    date: input.date,
                    method: input.method,
                    reference: input.reference,
                    notes: input.notes,
                }
            });
        }),

    list: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            supplierId: z.string().optional(),
            startDate: z.date().optional(),
            endDate: z.date().optional(),
        }))
        .query(async ({ ctx, input }) => {
            return ctx.prisma.supplierPayment.findMany({
                where: {
                    outletId: input.outletId,
                    supplierId: input.supplierId,
                    date: {
                        gte: input.startDate,
                        lte: input.endDate,
                    }
                },
                include: {
                    supplier: true,
                    outlet: true,
                },
                orderBy: { date: 'desc' }
            });
        }),

    delete: protectedProcedure
        .use(enforceTenant)
        .input(z.string())
        .mutation(async ({ ctx, input }) => {
            const payment = await ctx.prisma.supplierPayment.findUnique({
                where: { id: input }
            });

            if (!payment) throw new TRPCError({ code: "NOT_FOUND" });
            if (ctx.role !== "SUPER" && ctx.role !== "BRAND_ADMIN" && payment.outletId !== ctx.outletId) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            return ctx.prisma.supplierPayment.delete({
                where: { id: input }
            });
        })
});

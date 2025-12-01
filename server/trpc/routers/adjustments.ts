import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { enforceTenant } from "../middleware/roleCheck";
import { TRPCError } from "@trpc/server";

export const adjustmentsRouter = router({
    update: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            saleId: z.string(),
            swiggyPayout: z.number().min(0).optional(),
            zomatoPayout: z.number().min(0).optional(),
            cashWithdrawal: z.number().min(0).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            try {
                const sale = await ctx.prisma.sale.findUnique({
                    where: { id: input.saleId }
                });

                if (!sale) {
                    throw new TRPCError({ code: "NOT_FOUND", message: "Sale not found" });
                }

                // Calculate updated cash in hand if withdrawal changes
                let updatedCashInHand = sale.cashInHand;
                if (input.cashWithdrawal !== undefined) {
                    const currentWithdrawal = Number(sale.cashWithdrawal) || 0;
                    const newWithdrawal = input.cashWithdrawal;
                    const actualCash = Number(sale.cashInHand) + currentWithdrawal;
                    updatedCashInHand = (actualCash - newWithdrawal) as any;
                }

                return await ctx.prisma.sale.update({
                    where: { id: input.saleId },
                    data: {
                        swiggyPayout: input.swiggyPayout !== undefined ? input.swiggyPayout : undefined,
                        zomatoPayout: input.zomatoPayout !== undefined ? input.zomatoPayout : undefined,
                        cashWithdrawal: input.cashWithdrawal !== undefined ? input.cashWithdrawal : undefined,
                        cashInHand: input.cashWithdrawal !== undefined ? updatedCashInHand : undefined,
                    }
                });
            } catch (error) {
                if (error instanceof TRPCError) throw error;
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to update adjustment",
                    cause: error,
                });
            }
        }),

    getForDate: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            outletId: z.string(),
            date: z.date(),
        }))
        .query(async ({ ctx, input }) => {
            try {
                const startOfDay = new Date(input.date);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(input.date);
                endOfDay.setHours(23, 59, 59, 999);

                const sale = await ctx.prisma.sale.findFirst({
                    where: {
                        outletId: input.outletId,
                        date: {
                            gte: startOfDay,
                            lte: endOfDay
                        }
                    }
                });

                return sale;
            } catch (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to get adjustment for date",
                    cause: error,
                });
            }
        })
});

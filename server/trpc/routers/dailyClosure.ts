import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { enforceTenant } from "@/server/trpc/middleware/roleCheck";
import { TRPCError } from "@trpc/server";

export const dailyClosureRouter = router({
    // ---------- CREATE ----------
    create: protectedProcedure
        .use(enforceTenant) // ensures user belongs to the same tenant
        .input(
            z.object({
                outletId: z.string(),
                date: z.string().optional(),
                cashSale: z.number().min(0).optional(),
                bankSale: z.number().min(0).optional(),
                zomatoSale: z.number().min(0).optional(),
                swiggySale: z.number().min(0).optional(),
                expenses: z.array(
                    z.object({
                        amount: z.number().min(0),
                        description: z.string().optional(),
                    })
                ),
                stockSnapshot: z.record(z.number()), // { productId: qty }
            })
        )
        .mutation(async ({ ctx, input }) => {
            try {
                const {
                    outletId,
                    date,
                    cashSale = 0,
                    bankSale = 0,
                    zomatoSale = 0,
                    swiggySale = 0,
                    expenses,
                    stockSnapshot,
                } = input;

                // ---------- AUTHZ ----------
                if (ctx.role !== "SUPER" && ctx.role !== "BRAND_ADMIN" && ctx.outletId !== outletId) {
                    throw new TRPCError({ code: "FORBIDDEN" });
                }

                // ---------- CALCULATIONS ----------
                const totalSale = cashSale + bankSale + zomatoSale + swiggySale;
                const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
                const profit = totalSale - totalExpense;

                // ---------- DB INSERT ----------
                const closure = await ctx.prisma.$transaction(async (tx) => {
                    return tx.dailyClosure.create({
                        data: {
                            outletId,
                            date: date ? new Date(date) : new Date(),
                            cashSale,
                            bankSale,
                            zomatoSale,
                            swiggySale,
                            totalSale,
                            totalExpense,
                            profit,
                            stockSnapshot,
                        },
                    });
                });

                // ---------- GOOGLE SHEET PUSH (APPS SCRIPT) ----------
                const outlet = await ctx.prisma.outlet.findUnique({
                    where: { id: outletId },
                    select: { sheetExportUrl: true },
                });

                if (outlet?.sheetExportUrl) {
                    // Fire and forget - don't block the UI
                    fetch(outlet.sheetExportUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            date: closure.date.toISOString().split("T")[0],
                            cashSale: Number(closure.cashSale),
                            bankSale: Number(closure.bankSale),
                            zomatoSale: Number(closure.zomatoSale),
                            swiggySale: Number(closure.swiggySale),
                            totalSale: Number(closure.totalSale),
                            totalExpense: Number(closure.totalExpense),
                            profit: Number(closure.profit),
                            stockSnapshot: closure.stockSnapshot,
                        }),
                    }).catch(e => console.error("Failed to push to Google Sheet Apps Script", e));
                }

                return closure;
            } catch (error) {
                console.error("Error in dailyClosure.create:", error);
                if (error instanceof TRPCError) throw error;
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to create daily closure",
                    cause: error,
                });
            }
        }),

    // ---------- LIST ----------
    list: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ outletId: z.string(), startDate: z.string().optional(), endDate: z.string().optional() }))
        .query(async ({ ctx, input }) => {
            const { outletId, startDate, endDate } = input;
            if (ctx.role !== "SUPER" && ctx.role !== "BRAND_ADMIN" && ctx.outletId !== outletId) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            const where: any = { outletId };
            if (startDate || endDate) {
                where.date = {};
                if (startDate) where.date.gte = new Date(startDate);
                if (endDate) where.date.lte = new Date(endDate);
            }

            return ctx.prisma.dailyClosure.findMany({
                where,
                orderBy: { date: "desc" },
            });
        }),
});

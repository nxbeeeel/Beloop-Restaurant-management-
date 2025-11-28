import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { sendToGoogleSheets } from "@/lib/appsScript";

export const googleSheetsRouter = router({
    // Save Apps Script URL for an outlet
    saveAppsScriptUrl: protectedProcedure
        .input(z.object({
            outletId: z.string(),
            appsScriptUrl: z.string().url(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { outletId, appsScriptUrl } = input;

            // Verify user has access to this outlet
            const outlet = await ctx.prisma.outlet.findUnique({
                where: { id: outletId },
                select: { tenantId: true }
            });

            if (!outlet || outlet.tenantId !== ctx.tenantId) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            // Update outlet with Apps Script URL
            await ctx.prisma.outlet.update({
                where: { id: outletId },
                data: { googleSheetsUrl: appsScriptUrl }
            });

            return { success: true };
        }),

    // Get Apps Script URL for an outlet
    getAppsScriptUrl: protectedProcedure
        .input(z.object({
            outletId: z.string(),
        }))
        .query(async ({ ctx, input }) => {
            const outlet = await ctx.prisma.outlet.findUnique({
                where: { id: input.outletId },
                select: { tenantId: true, googleSheetsUrl: true }
            });

            if (!outlet || outlet.tenantId !== ctx.tenantId) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            return { appsScriptUrl: outlet.googleSheetsUrl };
        }),

    // Export monthly report to Google Sheets via Apps Script
    exportMonthlyReport: protectedProcedure
        .input(z.object({
            outletId: z.string(),
            year: z.number(),
            month: z.number().min(1).max(12),
        }))
        .mutation(async ({ ctx, input }) => {
            const { outletId, year, month } = input;

            // Get outlet with Apps Script URL
            const outlet = await ctx.prisma.outlet.findUnique({
                where: { id: outletId },
                select: {
                    tenantId: true,
                    name: true,
                    googleSheetsUrl: true
                }
            });

            if (!outlet || outlet.tenantId !== ctx.tenantId) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            if (!outlet.googleSheetsUrl) {
                throw new TRPCError({
                    code: "PRECONDITION_FAILED",
                    message: "Google Sheets Apps Script URL not configured for this outlet"
                });
            }

            // Fetch sales data
            const sales = await ctx.prisma.sale.findMany({
                where: {
                    outletId,
                    date: {
                        gte: new Date(year, month - 1, 1),
                        lt: new Date(year, month, 1),
                    }
                },
                include: {
                    staff: {
                        select: { name: true }
                    }
                },
                orderBy: { date: 'asc' }
            });

            // Fetch expenses data
            const expenses = await ctx.prisma.expense.findMany({
                where: {
                    outletId,
                    date: {
                        gte: new Date(year, month - 1, 1),
                        lt: new Date(year, month, 1),
                    }
                },
                include: {
                    staff: {
                        select: { name: true }
                    }
                },
                orderBy: { date: 'asc' }
            });

            // Transform data
            const salesData = sales.map(sale => ({
                date: sale.date.toISOString().split('T')[0],
                cashSale: Number(sale.cashSale),
                bankSale: Number(sale.bankSale),
                swiggy: Number(sale.swiggy),
                zomato: Number(sale.zomato),
                totalSale: Number(sale.totalSale),
                submittedBy: sale.staff.name,
            }));

            const expensesData = expenses.map(expense => ({
                date: expense.date.toISOString().split('T')[0],
                category: expense.category,
                amount: Number(expense.amount),
                description: expense.description || '',
                submittedBy: expense.staff.name,
            }));

            // Send to Google Sheets via Apps Script
            const result = await sendToGoogleSheets(outlet.googleSheetsUrl, {
                type: 'both',
                outletName: outlet.name,
                month,
                year,
                sales: salesData,
                expenses: expensesData,
            });

            return {
                success: result.success,
                spreadsheetUrl: result.spreadsheetUrl,
                spreadsheetId: result.spreadsheetId,
                salesCount: sales.length,
                expensesCount: expenses.length,
            };
        }),
});

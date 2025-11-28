import { z } from "zod";
import { router, protectedProcedure, requireRole } from "../trpc";
import { redis } from "../../redis";
import { TRPCError } from "@trpc/server";

const CACHE_TTL = 60 * 60 * 6; // 6 hours

export const analyticsRouter = router({
    getBrandOverview: protectedProcedure
        .use(requireRole(['BRAND_ADMIN', 'SUPER']))
        .input(z.object({
            month: z.string().optional(), // "YYYY-MM"
            outletId: z.string().optional()
        }))
        .query(async ({ ctx, input }) => {
            const { prisma, user } = ctx;
            const targetMonth = input.month || new Date().toISOString().slice(0, 7);

            if (!user.tenantId) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'User does not belong to a tenant' });
            }

            const cacheKey = `analytics:overview:${user.tenantId}:${targetMonth}:${input.outletId || 'all'}`;

            // 1. Try Cache
            if (redis) {
                const cached = await redis.get(cacheKey);
                if (cached) {
                    return JSON.parse(cached);
                }
            }

            // 2. Fetch Data (Cache Miss)
            // We fetch ALL data for the tenant to calculate rankings (Top/Loss/High Expense) correctly
            // even if a specific outlet is selected for the KPI view.
            const allSummaries = await prisma.monthlySummary.findMany({
                where: {
                    month: targetMonth,
                    outlet: {
                        tenantId: user.tenantId
                    }
                },
                include: {
                    outlet: {
                        select: { name: true, code: true }
                    }
                }
            });

            // Filter for KPIs if outletId is provided
            const kpiSummaries = input.outletId
                ? allSummaries.filter(s => s.outletId === input.outletId)
                : allSummaries;

            // Calculate Brand/Outlet Totals (based on filter)
            let totalSales = 0;
            let totalExpenses = 0;
            let totalProfit = 0;
            let totalWastage = 0;
            let totalGrossProfit = 0;

            kpiSummaries.forEach((s: any) => {
                totalSales += Number(s.totalSales);
                totalExpenses += Number(s.totalExpenses);
                totalProfit += Number(s.netProfit || 0);
                totalWastage += Number(s.totalWastage || 0);
                totalGrossProfit += Number(s.grossProfit || 0);
            });

            const netProfitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
            const grossProfitMargin = totalSales > 0 ? (totalGrossProfit / totalSales) * 100 : 0;
            const wastageRatio = totalSales > 0 ? (totalWastage / totalSales) * 100 : 0;

            // Identify Loss-Making Outlets (Always from ALL data for comparison)
            const lossMakingOutlets = allSummaries
                .filter((s: any) => Number(s.netProfit || 0) < 0)
                .map((s: any) => ({
                    id: s.outletId,
                    name: s.outlet.name,
                    netProfit: Number(s.netProfit || 0),
                    revenue: Number(s.totalSales)
                }))
                .sort((a, b) => a.netProfit - b.netProfit); // Lowest profit first

            // Top Performing Outlets (by Net Profit)
            const topOutlets = allSummaries
                .map((s: any) => ({
                    id: s.outletId,
                    name: s.outlet.name,
                    netProfit: Number(s.netProfit || 0),
                    margin: Number(s.profitMargin)
                }))
                .sort((a, b) => b.netProfit - a.netProfit)
                .slice(0, 5);

            // High Expense Outlets (by Total Expenses)
            const highExpenseOutlets = allSummaries
                .map((s: any) => ({
                    id: s.outletId,
                    name: s.outlet.name,
                    expenses: Number(s.totalExpenses),
                    revenue: Number(s.totalSales),
                    ratio: Number(s.totalSales) > 0 ? (Number(s.totalExpenses) / Number(s.totalSales)) * 100 : 0
                }))
                .sort((a, b) => b.expenses - a.expenses)
                .slice(0, 5);

            const result = {
                meta: {
                    month: targetMonth,
                    lastRefreshed: allSummaries[0]?.lastRefreshed || new Date()
                },
                kpis: {
                    totalSales,
                    totalExpenses,
                    netProfit: totalProfit,
                    netProfitMargin,
                    grossProfit: totalGrossProfit,
                    grossProfitMargin,
                    totalWastage,
                    wastageRatio
                },
                lossMakingOutlets,
                topOutlets,
                highExpenseOutlets,
                outletPerformance: allSummaries.map((s: any) => ({
                    id: s.outletId,
                    name: s.outlet.name,
                    sales: Number(s.totalSales),
                    profit: Number(s.netProfit || 0),
                    margin: Number(s.profitMargin),
                    wastage: Number(s.totalWastage || 0)
                }))
            };

            // 3. Set Cache
            if (redis) {
                await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });
            }

            return result;
        }),

    getSalesTrend: protectedProcedure
        .use(requireRole(['BRAND_ADMIN', 'SUPER']))
        .query(async ({ ctx }) => {
            const { prisma, user } = ctx;

            if (!user.tenantId) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'User does not belong to a tenant' });
            }

            const cacheKey = `analytics:trend:${user.tenantId}`;

            if (redis) {
                const cached = await redis.get(cacheKey);
                if (cached) {
                    return JSON.parse(cached);
                }
            }

            // Fetch last 6 months of data
            const summaries = await prisma.monthlySummary.findMany({
                where: {
                    outlet: {
                        tenantId: user.tenantId
                    }
                },
                orderBy: { month: 'asc' }
            });

            // Group by month
            const monthlyData: Record<string, { sales: number; profit: number }> = {};

            summaries.forEach((s: any) => {
                if (!monthlyData[s.month]) {
                    monthlyData[s.month] = { sales: 0, profit: 0 };
                }
                monthlyData[s.month].sales += Number(s.totalSales);
                monthlyData[s.month].profit += Number(s.netProfit || 0);
            });

            const result = Object.entries(monthlyData).map(([month, data]) => ({
                month,
                ...data
            }));

            if (redis) {
                await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });
            }

            return result;
        })
});

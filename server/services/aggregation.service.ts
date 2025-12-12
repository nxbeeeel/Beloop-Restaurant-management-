
import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

/**
 * Service to handle compaction of raw data into Analytics Materialized Views
 * (DailyBrandMetric, DailyOutletMetric)
 */
export class AggregationService {

    /**
     * Aggregates metrics for a specific Outlet for a given Date.
     * This is idempotent and can be run multiple times (it upserts).
     */
    static async aggregateOutletDay(outletId: string, date: Date) {
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999);

        // 1. Fetch Sales
        const sales = await prisma.sale.findMany({
            where: {
                outletId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        // 2. Fetch Expenses
        const expenses = await prisma.expense.findMany({
            where: {
                outletId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        // 3. Fetch Wastage
        const wastage = await prisma.wastage.findMany({
            where: {
                outletId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        // Calculate Totals using Decimal for precision
        let totalRevenue = new Decimal(0);
        let totalExpenses = new Decimal(0);
        let totalWastage = new Decimal(0);

        sales.forEach(s => totalRevenue = totalRevenue.plus(s.totalSale || 0));
        expenses.forEach(e => totalExpenses = totalExpenses.plus(e.amount || 0));
        wastage.forEach(w => totalWastage = totalWastage.plus(w.cost || 0));

        const netProfit = totalRevenue.minus(totalExpenses).minus(totalWastage);

        // 4. Update Materialized View
        // We need the tenantId, fetch it from outlet
        const outlet = await prisma.outlet.findUnique({ where: { id: outletId }, select: { tenantId: true } });
        if (!outlet) return;

        await prisma.dailyOutletMetric.upsert({
            where: {
                outletId_date: {
                    outletId,
                    date: startOfDay
                }
            },
            create: {
                outletId,
                tenantId: outlet.tenantId,
                date: startOfDay,
                totalRevenue,
                totalExpenses,
                totalWastage,
                netProfit,
                orderCount: sales.length // Approximation based on Sale records (usually 1 per order/shift)
            },
            update: {
                totalRevenue,
                totalExpenses,
                totalWastage,
                netProfit,
                orderCount: sales.length
            }
        });

        console.log(`[Aggregation] Refreshed Outlet Metric: ${outletId} for ${startOfDay.toISOString()}`);
    }

    /**
     * Aggregates metrics for a Brand (Tenant) by summing up all its Outlet Metrics.
     * Should be run AFTER Outlet Aggregation.
     */
    static async aggregateBrandDay(tenantId: string, date: Date) {
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);

        // Fetch all pre-calculated Outlet Metrics for this day
        const outletMetrics = await prisma.dailyOutletMetric.findMany({
            where: {
                tenantId,
                date: startOfDay
            }
        });

        let totalRevenue = new Decimal(0);
        let totalExpenses = new Decimal(0);
        let grossProfit = new Decimal(0); // Rev - COGS (not calculated yet, using Rev for now)
        let netProfit = new Decimal(0);
        let totalOrders = 0;

        outletMetrics.forEach(m => {
            totalRevenue = totalRevenue.plus(m.totalRevenue);
            totalExpenses = totalExpenses.plus(m.totalExpenses);
            netProfit = netProfit.plus(m.netProfit);
            totalOrders += m.orderCount;
        });

        grossProfit = totalRevenue; // Placeholder until COGS is strictly tracked

        const avgTicketValue = totalOrders > 0 ? totalRevenue.div(totalOrders) : new Decimal(0);

        // Update Brand View
        await prisma.dailyBrandMetric.upsert({
            where: {
                tenantId_date: {
                    tenantId,
                    date: startOfDay
                }
            },
            create: {
                tenantId,
                date: startOfDay,
                totalRevenue,
                totalExpenses,
                grossProfit,
                netProfit,
                totalOrders,
                avgTicketValue
            },
            update: {
                totalRevenue,
                totalExpenses,
                grossProfit,
                netProfit,
                totalOrders,
                avgTicketValue,
                updatedAt: new Date()
            }
        });

        console.log(`[Aggregation] Refreshed Brand Metric: ${tenantId} for ${startOfDay.toISOString()}`);
    }

    /**
     * On-Demand Refresh: Aggregates everything for today for a specific Tenant.
     * Useful for "Real-Time" dashboard buttons.
     */
    static async refreshToday(tenantId: string) {
        const today = new Date();

        // 1. Find all outlets
        const outlets = await prisma.outlet.findMany({ where: { tenantId }, select: { id: true } });

        // 2. Aggregate each outlet (Parallel)
        await Promise.all(outlets.map(o => this.aggregateOutletDay(o.id, today)));

        // 3. Aggregate Brand
        await this.aggregateBrandDay(tenantId, today);

        return { success: true };
    }
}

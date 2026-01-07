
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
    /**
     * Aggregates metrics for a specific Month (The Cube)
     * Target: MonthlyMetric
     */
    static async refreshMonthly(tenantId: string, month: string) {
        // month format: "YYYY-MM"
        const [year, m] = month.split('-').map(Number);
        const startOfMonth = new Date(Date.UTC(year, m - 1, 1));
        const endOfMonth = new Date(Date.UTC(year, m, 0, 23, 59, 59, 999));

        console.log(`[Aggregation] Refreshing Monthly Cube for ${tenantId} (${month})`);

        // 1. Aggregate Financials (from Daily Metrics for speed)
        const dailyMetrics = await prisma.dailyBrandMetric.findMany({
            where: {
                tenantId,
                date: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            }
        });

        let totalRevenue = new Decimal(0);
        let totalOrders = 0;

        dailyMetrics.forEach(d => {
            totalRevenue = totalRevenue.plus(d.totalRevenue);
            totalOrders += d.totalOrders;
        });

        const avgOrderValue = totalOrders > 0 ? totalRevenue.div(totalOrders) : new Decimal(0);

        // 2. Aggregate Top Items (Heavy Query - from Orders)
        // We limit to top 5 to keep the JSON light
        const topItems = await prisma.orderItem.groupBy({
            by: ['name'],
            where: {
                order: {
                    tenantId,
                    createdAt: {
                        gte: startOfMonth,
                        lte: endOfMonth
                    },
                    status: 'COMPLETED'
                }
            },
            _sum: {
                quantity: true,
                total: true
            },
            orderBy: {
                _sum: {
                    total: 'desc'
                }
            },
            take: 5
        });

        const formattedTopItems = topItems.map(item => ({
            name: item.name,
            qty: item._sum.quantity || 0,
            rev: item._sum.total ? item._sum.total.toNumber() : 0
        }));

        // 3. Upsert Cube
        await prisma.monthlyMetric.upsert({
            where: {
                tenantId_outletId_month: {
                    tenantId,
                    outletId: "", // Tenant-wide (empty string as sentinel)
                    month
                } // Prisma might complain about null, but we defined it nullable. 
                // Actually unique constraint with nulls depends on DB.
                // For simplicity in Prisma, we might need a specific handling if unique fails.
                // But let's try standard upsert.
            },
            create: {
                tenantId,
                outletId: "",
                month,
                totalRevenue,
                totalOrders,
                avgOrderValue,
                topItems: formattedTopItems,
                lastRefreshed: new Date()
            },
            update: {
                totalRevenue,
                totalOrders,
                avgOrderValue,
                topItems: formattedTopItems,
                lastRefreshed: new Date()
            }
        });

        console.log(`[Aggregation] Cube Updated: ${month}`);
    }
}

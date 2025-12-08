import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { prisma } from '@/server/db';
import { redis } from '@/server/services/cache.service';

export const brandAnalyticsRouter = createTRPCRouter({
    /**
     * Get Brand Overview - Main KPIs for dashboard
     * Cached for 6 hours in Redis
     */
    getBrandOverview: protectedProcedure.query(async ({ ctx }) => {
        const user = await prisma.user.findUnique({
            where: { clerkId: ctx.userId },
            select: { tenantId: true, role: true }
        });

        if (!user?.tenantId || (user.role !== 'BRAND_ADMIN' && user.role !== 'SUPER')) {
            throw new Error('Unauthorized');
        }

        // Try cache first
        const cacheKey = `brand:${user.tenantId}:overview`;
        const cached = await redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // Query data
        const [outlets, totalStaff, recentSales] = await Promise.all([
            // Active outlets count
            prisma.outlet.count({
                where: { tenantId: user.tenantId }
            }),

            // Total staff across all outlets
            prisma.user.count({
                where: { tenantId: user.tenantId }
            }),

            // Recent sales data (last 30 days)
            prisma.sale.aggregate({
                where: {
                    outlet: { tenantId: user.tenantId },
                    date: {
                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    }
                },
                _sum: { totalSale: true }
            })
        ]);

        const data = {
            activeOutlets: outlets,
            totalStaff: totalStaff,
            totalRevenue: recentSales._sum.totalSale || 0,
            revenueChange: 0, // TODO: Calculate from previous period
        };

        // Cache for 6 hours
        await redis.setex(cacheKey, 21600, JSON.stringify(data));

        return data;
    }),

    /**
     * Get Outlet Performance - Detailed outlet stats
     * Cached for 6 hours in Redis
     */
    getOutletPerformance: protectedProcedure.query(async ({ ctx }) => {
        const user = await prisma.user.findUnique({
            where: { clerkId: ctx.userId },
            select: { tenantId: true, role: true }
        });

        if (!user?.tenantId || (user.role !== 'BRAND_ADMIN' && user.role !== 'SUPER')) {
            throw new Error('Unauthorized');
        }

        // Try cache first
        const cacheKey = `brand:${user.tenantId}:outlets`;
        const cached = await redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // Query outlet performance data
        const outlets = await prisma.outlet.findMany({
            where: { tenantId: user.tenantId },
            select: {
                id: true,
                name: true,
                code: true,
                _count: {
                    select: { users: true }
                },
                sales: {
                    take: 1,
                    orderBy: { date: 'desc' },
                    select: {
                        totalSale: true,
                        date: true
                    }
                }
            }
        });

        const data = outlets.map(outlet => ({
            id: outlet.id,
            name: outlet.name,
            code: outlet.code,
            staffCount: outlet._count.users,
            lastSale: outlet.sales[0]?.totalSale || 0,
            lastSaleDate: outlet.sales[0]?.date || null,
            status: 'active' as const
        }));

        // Cache for 6 hours
        await redis.setex(cacheKey, 21600, JSON.stringify(data));

        return data;
    }),

    /**
     * Invalidate brand cache - Call after data updates
     */
    invalidateCache: protectedProcedure
        .input(z.object({ tenantId: z.string() }))
        .mutation(async ({ input }) => {
            await Promise.all([
                redis.del(`brand:${input.tenantId}:overview`),
                redis.del(`brand:${input.tenantId}:outlets`)
            ]);
            return { success: true };
        })
});

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

// Middleware to require SUPER role
const requireSuper = protectedProcedure.use(async ({ ctx, next }) => {
    if (ctx.role !== 'SUPER') {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only super admins can access this resource',
        });
    }
    return next();
});

export const superAnalyticsRouter = router({
    // Platform-wide statistics
    getPlatformStats: requireSuper.query(async ({ ctx }) => {
        const { AnalyticsService } = await import("../../services/analytics.service");
        return AnalyticsService.getPlatformStats(ctx.prisma);
    }),

    // Revenue trend over last 30 days
    getRevenueTrend: requireSuper
        .input(z.object({
            days: z.number().default(30),
        }))
        .query(async ({ ctx, input }) => {
            const { AnalyticsService } = await import("../../services/analytics.service");
            return AnalyticsService.getRevenueTrend(ctx.prisma, input.days);
        }),

    // Tenant health monitoring
    getTenantHealth: requireSuper.query(async ({ ctx }) => {
        const { AnalyticsService } = await import("../../services/analytics.service");
        return AnalyticsService.getTenantHealth(ctx.prisma);
    }),

    // Recent activity feed
    getRecentActivity: requireSuper
        .input(z.object({
            limit: z.number().default(20),
        }))
        .query(async ({ ctx, input }) => {
            const { AnalyticsService } = await import("../../services/analytics.service");
            return AnalyticsService.getRecentActivity(ctx.prisma, input.limit);
        }),

    // Top performing tenants
    getTopTenants: requireSuper
        .input(z.object({
            metric: z.enum(['revenue', 'users', 'growth']).default('revenue'),
            limit: z.number().default(10),
        }))
        .query(async ({ ctx, input }) => {
            const { AnalyticsService } = await import("../../services/analytics.service");
            return AnalyticsService.getTopTenants(ctx.prisma, input.metric, input.limit);
        }),

    // User growth over time
    getUserGrowth: requireSuper
        .input(z.object({
            days: z.number().default(30),
        }))
        .query(async ({ ctx, input }) => {
            const { AnalyticsService } = await import("../../services/analytics.service");
            return AnalyticsService.getUserGrowth(ctx.prisma, input.days);
        }),
});

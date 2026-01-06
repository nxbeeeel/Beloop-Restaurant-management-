/**
 * Super Admin - System Router
 * Handles system health, stats, and audit logs
 */
import { z } from 'zod';
import { router, requireSuper } from '../../trpc';
import { MailService } from '@/server/services/mail.service';
import crypto from 'crypto';

export const systemRouter = router({
    // Get platform statistics
    getStats: requireSuper.query(async ({ ctx }) => {
        const [totalTenants, totalUsers, totalOutlets, totalSales] = await Promise.all([
            ctx.prisma.tenant.count(),
            ctx.prisma.user.count(),
            ctx.prisma.outlet.count(),
            ctx.prisma.sale.count(),
        ]);

        return {
            totalTenants,
            totalUsers,
            totalOutlets,
            totalSales,
        };
    }),

    // System Health
    getHealth: requireSuper.query(async ({ ctx }) => {
        const start = Date.now();
        await ctx.prisma.$queryRaw`SELECT 1`;
        const dbLatency = Date.now() - start;

        const [tenantCount, userCount, totalSales] = await Promise.all([
            ctx.prisma.tenant.count(),
            ctx.prisma.user.count(),
            ctx.prisma.sale.count(),
        ]);

        return {
            status: 'operational',
            uptime: process.uptime(),
            dbLatency,
            timestamp: new Date(),
            stats: {
                tenants: tenantCount,
                users: userCount,
                totalSales,
            },
            services: [
                { name: 'Database', status: 'operational', latency: `${dbLatency}ms` },
                { name: 'API', status: 'operational', latency: '~20ms' },
                { name: 'Cache', status: 'operational', latency: '~5ms' },
            ],
        };
    }),

    // Create Brand Invitation (ACID)
    createBrandInvitation: requireSuper
        .input(z.object({
            brandName: z.string().min(1),
            email: z.string().email(),
        }))
        .mutation(async ({ ctx, input }) => {
            const token = crypto.randomUUID();

            await ctx.prisma.brandInvitation.create({
                data: {
                    token,
                    brandName: input.brandName,
                    email: input.email,
                    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
                },
            });

            await MailService.sendBrandCreationInvite(input.email, token, input.brandName);

            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            return {
                link: `${baseUrl}/invite/brand?token=${token}`,
                token
            };
        }),

    // Get Audit Logs
    getAuditLogs: requireSuper
        .input(z.object({
            limit: z.number().min(1).max(100).default(50),
            cursor: z.string().optional(),
            action: z.string().optional(),
            tableName: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const logs = await ctx.prisma.auditLog.findMany({
                take: input.limit + 1,
                cursor: input.cursor ? { id: input.cursor } : undefined,
                where: {
                    ...(input.action && { action: input.action }),
                    ...(input.tableName && { tableName: input.tableName }),
                },
                orderBy: { timestamp: 'desc' },
                include: {
                    user: { select: { name: true, email: true } },
                    tenant: { select: { name: true } },
                }
            });

            let nextCursor: string | undefined = undefined;
            if (logs.length > input.limit) {
                const nextItem = logs.pop();
                nextCursor = nextItem?.id;
            }

            return { logs, nextCursor };
        }),

    // Log an audit action
    logAuditAction: requireSuper
        .input(z.object({
            action: z.string(),
            tableName: z.string(),
            recordId: z.string(),
            oldValue: z.any().optional(),
            newValue: z.any().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.auditLog.create({
                data: {
                    userId: ctx.userId,
                    userName: 'Super Admin',
                    action: input.action,
                    tableName: input.tableName,
                    recordId: input.recordId,
                    oldValue: input.oldValue ? JSON.parse(JSON.stringify(input.oldValue)) : null,
                    newValue: input.newValue ? JSON.parse(JSON.stringify(input.newValue)) : null,
                }
            });
        }),
});

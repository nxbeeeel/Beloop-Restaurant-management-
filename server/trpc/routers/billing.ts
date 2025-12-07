import { z } from 'zod';
import { router, requireSuper } from '../trpc';

export const billingRouter = router({
    getBillingOverview: requireSuper.query(async ({ ctx }) => {
        const tenants = await ctx.prisma.tenant.findMany({
            where: {
                status: 'ACTIVE'
            },
            include: {
                _count: {
                    select: { outlets: true }
                },
                payments: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return tenants.map(t => {
            const outletCount = t._count.outlets;
            const monthlyFee = outletCount * t.pricePerOutlet;

            // Calculate status
            // If nextBillingDate is null, maybe they are on trial or just started.
            // If nextBillingDate < now, they are overdue.
            const isOverdue = t.nextBillingDate ? new Date() > t.nextBillingDate : false;

            // Days overdue
            const daysOverdue = t.nextBillingDate
                ? Math.ceil((new Date().getTime() - t.nextBillingDate.getTime()) / (1000 * 3600 * 24))
                : 0;

            return {
                id: t.id,
                name: t.name,
                outletCount,
                pricePerOutlet: t.pricePerOutlet,
                monthlyFee,
                nextBillingDate: t.nextBillingDate,
                isOverdue,
                daysOverdue: isOverdue ? daysOverdue : 0,
                lastPayment: t.payments[0] || null
            };
        });
    }),

    // Calculate bill for a specific tenant
    calculateBill: requireSuper
        .input(z.object({ tenantId: z.string() }))
        .query(async ({ ctx, input }) => {
            const tenant = await ctx.prisma.tenant.findUnique({
                where: { id: input.tenantId },
                include: { _count: { select: { outlets: true } } }
            });

            if (!tenant) throw new Error('Tenant not found');

            const outletCount = tenant._count.outlets;
            const totalAmount = outletCount * tenant.pricePerOutlet;

            return {
                tenantId: tenant.id,
                outletCount,
                pricePerOutlet: tenant.pricePerOutlet,
                totalAmount
            };
        }),
});

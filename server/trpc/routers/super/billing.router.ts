/**
 * Super Admin - Billing Router
 * Handles all payment and billing operations
 */
import { z } from 'zod';
import { router, requireSuper } from '../../trpc';

export const billingRouter = router({
    // Get billing overview for all active tenants
    getBillingOverview: requireSuper.query(async ({ ctx }) => {
        const tenants = await ctx.prisma.tenant.findMany({
            where: { status: 'ACTIVE' },
            include: {
                _count: { select: { outlets: true } },
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
            const isOverdue = t.nextBillingDate ? new Date() > t.nextBillingDate : false;
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

    // List all payments
    listPayments: requireSuper.query(async ({ ctx }) => {
        const payments = await ctx.prisma.payment.findMany({
            include: {
                tenant: {
                    select: { name: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return payments;
    }),

    // Confirm payment
    confirm: requireSuper
        .input(z.object({ paymentId: z.string(), tenantId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const payment = await ctx.prisma.payment.update({
                where: { id: input.paymentId },
                data: { status: 'COMPLETED' },
            });

            const tenant = await ctx.prisma.tenant.findUnique({ where: { id: input.tenantId } });
            const currentExpiry = tenant?.nextBillingDate || new Date();
            const nextBillingDate = new Date(currentExpiry);
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

            await ctx.prisma.tenant.update({
                where: { id: input.tenantId },
                data: {
                    subscriptionStatus: 'ACTIVE',
                    nextBillingDate: nextBillingDate,
                    status: 'ACTIVE',
                    isPaymentDue: false
                },
            });

            return payment;
        }),

    // Request Payment
    requestPayment: requireSuper
        .input(z.object({ tenantId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const tenant = await ctx.prisma.tenant.update({
                where: { id: input.tenantId },
                data: { isPaymentDue: true },
            });
            return tenant;
        }),

    // Record Manual Payment
    recordPayment: requireSuper
        .input(z.object({
            tenantId: z.string(),
            amount: z.number(),
            method: z.string(),
            date: z.date(),
            notes: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const payment = await ctx.prisma.payment.create({
                data: {
                    tenantId: input.tenantId,
                    amount: input.amount,
                    method: input.method,
                    status: 'COMPLETED',
                    recordedBy: ctx.user.id,
                    notes: input.notes,
                    createdAt: input.date,
                },
            });

            const tenant = await ctx.prisma.tenant.findUnique({ where: { id: input.tenantId } });
            const currentExpiry = tenant?.nextBillingDate || new Date();
            const nextBillingDate = new Date(currentExpiry);
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

            await ctx.prisma.tenant.update({
                where: { id: input.tenantId },
                data: {
                    subscriptionStatus: 'ACTIVE',
                    nextBillingDate: nextBillingDate,
                    status: 'ACTIVE',
                    isPaymentDue: false
                },
            });

            return payment;
        }),
});

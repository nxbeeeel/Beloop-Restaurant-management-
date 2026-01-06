/**
 * Super Admin - Billing Router
 * Handles all payment and billing operations
 */
import { z } from 'zod';
import { router, requireSuper } from '../../trpc';

export const billingRouter = router({
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

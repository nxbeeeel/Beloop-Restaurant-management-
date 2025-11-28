import { z } from 'zod';
import { router, requireSuper } from '../trpc';

export const paymentRouter = router({
    // Record a new payment (Super Admin only)
    recordPayment: requireSuper
        .input(
            z.object({
                tenantId: z.string(),
                amount: z.number(),
                currency: z.string().default('INR'),
                status: z.enum(['COMPLETED', 'PENDING', 'FAILED']).default('COMPLETED'),
                method: z.enum(['CASH', 'UPI', 'BANK_TRANSFER']),
                reference: z.string().optional(),
                notes: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const payment = await ctx.prisma.payment.create({
                data: {
                    tenantId: input.tenantId,
                    amount: input.amount,
                    currency: input.currency,
                    status: input.status,
                    method: input.method,
                    reference: input.reference,
                    notes: input.notes,
                    recordedBy: ctx.user.id,
                },
            });

            return payment;
        }),

    // List payments for a tenant
    listPayments: requireSuper
        .input(
            z.object({
                tenantId: z.string(),
            })
        )
        .query(async ({ ctx, input }) => {
            const payments = await ctx.prisma.payment.findMany({
                where: {
                    tenantId: input.tenantId,
                },
                orderBy: {
                    createdAt: 'desc',
                },
                include: {
                    tenant: {
                        select: {
                            name: true,
                        },
                    },
                },
            });

            return payments;
        }),

    // Get total revenue (already in superAnalytics, but maybe useful here too)
    getTotalRevenue: requireSuper.query(async ({ ctx }) => {
        const payments = await ctx.prisma.payment.aggregate({
            where: {
                status: 'COMPLETED',
            },
            _sum: {
                amount: true,
            },
        });

        return payments._sum.amount || 0;
    }),
});

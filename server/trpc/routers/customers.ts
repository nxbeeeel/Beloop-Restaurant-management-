import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { enforceTenant } from "../middleware/roleCheck";
import { TRPCError } from "@trpc/server";

export const customersRouter = router({
    getAll: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            search: z.string().optional(),
            status: z.enum(['active', 'inactive', 'all']).optional(),
            tag: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const where: any = {
                tenantId: ctx.tenantId,
            };

            if (input.search) {
                where.OR = [
                    { name: { contains: input.search, mode: 'insensitive' } },
                    { email: { contains: input.search, mode: 'insensitive' } },
                    { phoneNumber: { contains: input.search } },
                ];
            }

            // Note: Status and Tags are not directly on Customer model in schema.
            // We might need to infer status from last order or add these fields.
            // For now, we'll return all and filter in memory or ignore status/tag if not present.
            // The schema has `LoyaltyProgress` which has `lastVisit`.

            const customers = await ctx.prisma.customer.findMany({
                where,
                include: {
                    orders: {
                        select: {
                            totalAmount: true,
                            createdAt: true,
                        }
                    },
                    loyalty: true
                },
                orderBy: { updatedAt: 'desc' }
            });

            // Map to UI format
            return customers.map(c => {
                const totalSpent = c.orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
                const totalOrders = c.orders.length;
                const lastVisit = c.orders.length > 0 ? c.orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt : c.createdAt;

                // Infer status
                const daysSinceLastVisit = (new Date().getTime() - lastVisit.getTime()) / (1000 * 3600 * 24);
                const status = daysSinceLastVisit < 90 ? 'active' : 'inactive';

                // Infer tags (simple logic for now)
                const tags = [];
                if (totalSpent > 10000) tags.push('VIP');
                if (totalOrders > 10) tags.push('Regular');
                if (daysSinceLastVisit < 7) tags.push('Recent');

                return {
                    id: c.id,
                    name: c.name || 'Unknown',
                    email: c.email || '',
                    phone: c.phoneNumber,
                    totalOrders,
                    totalSpent,
                    lastVisit: lastVisit.toISOString().split('T')[0],
                    loyaltyPoints: c.loyalty.reduce((sum, l) => sum + l.stamps, 0), // Using stamps as points
                    status,
                    tags,
                };
            });
        }),

    getStats: protectedProcedure
        .use(enforceTenant)
        .query(async ({ ctx }) => {
            const customers = await ctx.prisma.customer.findMany({
                where: { tenantId: ctx.tenantId },
                include: { orders: { select: { totalAmount: true } } }
            });

            const totalCustomers = customers.length;
            const totalSpent = customers.reduce((sum, c) => sum + c.orders.reduce((s, o) => s + Number(o.totalAmount), 0), 0);
            const avgSpent = totalCustomers > 0 ? totalSpent / totalCustomers : 0;

            // Simple active logic
            // Ideally we should query this efficiently
            return {
                totalCustomers,
                activeCustomers: totalCustomers, // Placeholder
                vipCustomers: 0, // Placeholder
                avgSpent: Math.round(avgSpent)
            };
        }),

    create: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            name: z.string(),
            email: z.string().email().optional(),
            phone: z.string(),
            birthday: z.string().optional(),
            tags: z.string().optional(), // Comma separated
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.customer.create({
                data: {
                    tenantId: ctx.tenantId!,
                    name: input.name,
                    email: input.email,
                    phoneNumber: input.phone,
                    // Birthday and tags not in schema yet, ignoring for now or storing in metadata if we had it
                }
            });
        }),
});

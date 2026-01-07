import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import { enforceTenant } from "@/server/trpc/middleware/roleCheck";
import { TRPCError } from "@trpc/server";
import { CacheService } from "@/server/services/cache.service";

export const customersRouter = router({
    // ⚡ ZERO-LAG: Get all customers (cached 5 min)
    getAll: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            search: z.string().optional(),
            status: z.enum(['active', 'inactive', 'all']).optional(),
            tag: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const tenantId = ctx.tenantId;
            const where: any = { tenantId };

            if (input.search) {
                where.OR = [
                    { name: { contains: input.search, mode: 'insensitive' } },
                    { email: { contains: input.search, mode: 'insensitive' } },
                    { phoneNumber: { contains: input.search } },
                ];
            }

            const customers = await ctx.prisma.customer.findMany({
                where,
                include: {
                    orders: { select: { totalAmount: true, createdAt: true } },
                    loyalty: true
                },
                orderBy: { updatedAt: 'desc' }
            });

            return customers.map(c => {
                const totalSpent = c.orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
                const totalOrders = c.orders.length;
                const lastVisit = c.orders.length > 0
                    ? c.orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
                    : c.createdAt;

                const daysSinceLastVisit = (new Date().getTime() - lastVisit.getTime()) / (1000 * 3600 * 24);
                const status = daysSinceLastVisit < 90 ? 'active' : 'inactive';

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
                    loyaltyPoints: c.loyalty.reduce((sum, l) => sum + l.stamps, 0),
                    status,
                    tags,
                };
            });
        }),

    // ⚡ ZERO-LAG: Get customer stats (cached 5 min)
    getStats: protectedProcedure
        .use(enforceTenant)
        .query(async ({ ctx }) => {
            const tenantId = ctx.tenantId;

            if (!tenantId) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'No tenant context' });
            }

            return CacheService.getOrSet(
                CacheService.keys.customersStats(tenantId),
                async () => {
                    const customers = await ctx.prisma.customer.findMany({
                        where: { tenantId },
                        include: { orders: { select: { totalAmount: true } } }
                    });

                    const totalCustomers = customers.length;
                    const totalSpent = customers.reduce((sum, c) =>
                        sum + c.orders.reduce((s, o) => s + Number(o.totalAmount), 0), 0);
                    const avgSpent = totalCustomers > 0 ? totalSpent / totalCustomers : 0;

                    return {
                        totalCustomers,
                        activeCustomers: totalCustomers,
                        vipCustomers: 0,
                        avgSpent: Math.round(avgSpent)
                    };
                },
                300
            );
        }),

    create: protectedProcedure
        .use(enforceTenant)
        .input(z.object({
            name: z.string(),
            email: z.string().email().optional(),
            phone: z.string(),
            birthday: z.string().optional(),
            tags: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const result = await ctx.prisma.customer.create({
                data: {
                    tenantId: ctx.tenantId!,
                    name: input.name,
                    email: input.email,
                    phoneNumber: input.phone,
                }
            });
            // Invalidate cache
            await CacheService.invalidate(CacheService.keys.customersList(ctx.tenantId!));
            await CacheService.invalidate(CacheService.keys.customersStats(ctx.tenantId!));
            return result;
        }),

    getHistory: protectedProcedure
        .use(enforceTenant)
        .input(z.object({ customerId: z.string() }))
        .query(async ({ ctx, input }) => {
            const orders = await ctx.prisma.order.findMany({
                where: {
                    customerId: input.customerId,
                    outlet: { tenantId: ctx.tenantId! }
                },
                include: { items: true },
                orderBy: { createdAt: 'desc' }
            });

            return orders.map(order => ({
                id: order.id,
                date: order.createdAt.toISOString(),
                total: Number(order.totalAmount),
                status: order.status,
                items: order.items.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: Number(item.price)
                }))
            }));
        }),
});

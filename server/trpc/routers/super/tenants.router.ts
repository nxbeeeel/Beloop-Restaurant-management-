/**
 * Super Admin - Tenants Router
 * Handles all tenant/brand management operations
 */
import { z } from 'zod';
import { router, requireSuper } from '../../trpc';
import { TRPCError } from '@trpc/server';
import { CacheService } from '@/server/services/cache.service';
import { ProvisioningService } from '@/server/services/provisioning.service';

export const tenantsRouter = router({
    // ⚡ ZERO-LAG: List all tenants (cached 5 min)
    list: requireSuper.query(async ({ ctx }) => {
        return CacheService.getOrSet(
            CacheService.keys.allTenants(),
            async () => {
                const tenants = await ctx.prisma.tenant.findMany({
                    include: {
                        _count: {
                            select: {
                                outlets: true,
                                users: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                });
                return tenants;
            },
            300
        );
    }),

    // Get tenant details
    getDetails: requireSuper
        .input(z.object({ tenantId: z.string() }))
        .query(async ({ ctx, input }) => {
            const tenant = await ctx.prisma.tenant.findUnique({
                where: { id: input.tenantId },
                include: {
                    outlets: {
                        select: {
                            id: true,
                            name: true,
                            address: true,
                            phone: true,
                            _count: {
                                select: { sales: true, expenses: true },
                            },
                        },
                    },
                    users: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                            createdAt: true,
                            isActive: true,
                        },
                    },
                    payments: {
                        orderBy: { createdAt: 'desc' },
                        take: 10,
                    },
                },
            });

            if (!tenant) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Tenant not found',
                });
            }

            return tenant;
        }),

    // Update tenant status
    updateStatus: requireSuper
        .input(
            z.object({
                tenantId: z.string(),
                status: z.enum(['ACTIVE', 'SUSPENDED', 'PAUSED', 'TRIAL', 'PENDING']),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const tenant = await ctx.prisma.tenant.update({
                where: { id: input.tenantId },
                data: { status: input.status },
            });
            await CacheService.invalidate(CacheService.keys.allTenants());
            return tenant;
        }),

    // Update tenant pricing
    updatePricing: requireSuper
        .input(
            z.object({
                tenantId: z.string(),
                pricePerOutlet: z.number().optional(),
                currency: z.string().optional(),
                billingCycle: z.enum(['MONTHLY', 'YEARLY']).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const tenant = await ctx.prisma.tenant.update({
                where: { id: input.tenantId },
                data: {
                    ...(input.pricePerOutlet !== undefined && { pricePerOutlet: input.pricePerOutlet }),
                    ...(input.currency && { currency: input.currency }),
                    ...(input.billingCycle && { billingCycle: input.billingCycle }),
                },
            });
            return tenant;
        }),

    // Get overdue tenants
    getOverdue: requireSuper.query(async ({ ctx }) => {
        return ctx.prisma.tenant.findMany({
            where: { isPaymentDue: true },
            select: {
                id: true,
                name: true,
                nextBillingDate: true,
                pricePerOutlet: true,
                outlets: {
                    take: 1,
                    select: {
                        users: {
                            where: { role: 'BRAND_ADMIN' },
                            take: 1,
                            select: { email: true }
                        }
                    }
                }
            }
        });
    }),

    // Invite Brand (Uses ProvisioningService)
    invite: requireSuper
        .input(z.object({
            brandName: z.string().min(1),
            email: z.string().email(),
            contactName: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            // Check if user exists
            const existingUser = await ctx.prisma.user.findUnique({ where: { email: input.email } });
            if (existingUser) {
                throw new TRPCError({ code: 'CONFLICT', message: 'User with this email already exists' });
            }

            // Slug generation
            let slug = input.brandName.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const existingTenant = await ctx.prisma.tenant.findUnique({ where: { slug } });
            if (existingTenant) {
                slug = `${slug}-${Date.now()}`;
            }

            // Create Tenant
            const tenant = await ctx.prisma.tenant.create({
                data: {
                    name: input.brandName,
                    slug: slug,
                    pricePerOutlet: 250,
                    status: 'PENDING',
                    subscriptionStatus: 'TRIAL',
                    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },
            });

            // Transactional Provisioning
            const invite = await ProvisioningService.inviteBrandAdmin({
                email: input.email,
                name: input.contactName || 'Brand Admin',
                brandName: input.brandName,
                tenantId: tenant.id,
                superAdminClerkId: ctx.userId!,
                superAdminDbId: ctx.user.id
            });

            await CacheService.invalidate(CacheService.keys.allTenants());
            return { success: true, tenant, invite };
        }),

    // Delete Tenant (CASCADE)
    delete: requireSuper
        .input(z.object({ tenantId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const tenantId = input.tenantId;

            await ctx.prisma.$transaction(async (tx) => {
                const outlets = await tx.outlet.findMany({
                    where: { tenantId },
                    select: { id: true }
                });
                const outletIds = outlets.map(o => o.id);

                const users = await tx.user.findMany({
                    where: { tenantId },
                    select: { id: true }
                });
                const userIds = users.map(u => u.id);

                if (outletIds.length > 0) {
                    await tx.stockVerification.deleteMany({ where: { outletId: { in: outletIds } } });
                    await tx.stockCheck.deleteMany({ where: { outletId: { in: outletIds } } });
                    await tx.stockMove.deleteMany({ where: { outletId: { in: outletIds } } });
                    await tx.purchaseOrder.deleteMany({ where: { outletId: { in: outletIds } } });
                    await tx.product.deleteMany({ where: { outletId: { in: outletIds } } });
                    await tx.category.deleteMany({ where: { outletId: { in: outletIds } } });
                    await tx.sale.deleteMany({ where: { outletId: { in: outletIds } } });
                    await tx.expense.deleteMany({ where: { outletId: { in: outletIds } } });
                    await tx.dailyClosure.deleteMany({ where: { outletId: { in: outletIds } } });
                    await tx.invitation.deleteMany({ where: { outletId: { in: outletIds } } });
                }

                if (userIds.length > 0) {
                    await tx.ticketComment.deleteMany({ where: { userId: { in: userIds } } });
                    await tx.ticket.deleteMany({ where: { userId: { in: userIds } } });
                    await tx.auditLog.deleteMany({ where: { userId: { in: userIds } } });
                    await tx.temporaryPassword.deleteMany({ where: { userId: { in: userIds } } });
                }

                await tx.supplier.deleteMany({ where: { tenantId } });
                await tx.invitation.deleteMany({ where: { tenantId } });
                await tx.customer.deleteMany({ where: { tenantId } });
                await tx.dailyBrandMetric.deleteMany({ where: { tenantId } });
                await tx.monthlySummary.deleteMany({ where: { tenantId } }).catch(() => { });

                await tx.user.deleteMany({ where: { tenantId } });
                await tx.outlet.deleteMany({ where: { tenantId } });
                await tx.tenant.delete({ where: { id: tenantId } });
            }, {
                timeout: 30000,
                maxWait: 10000,
            });

            await CacheService.invalidate(CacheService.keys.allTenants());
            return { success: true };
        }),
});

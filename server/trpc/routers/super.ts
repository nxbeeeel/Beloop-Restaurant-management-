import { z } from 'zod';
import { router, requireSuper } from '../trpc';
import { TRPCError } from '@trpc/server';
import { MailService } from '@/server/services/mail.service';
import { ProvisioningService } from '@/server/services/provisioning.service';
import crypto from 'crypto';

export const superRouter = router({
    // List all tenants
    listTenants: requireSuper.query(async ({ ctx }) => {
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
    }),

    // Get tenant details
    getTenantDetails: requireSuper
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

    // List all users across all tenants
    listAllUsers: requireSuper
        .input(
            z.object({
                tenantId: z.string().optional(),
                role: z.enum(['SUPER', 'BRAND_ADMIN', 'OUTLET_MANAGER', 'STAFF']).optional(),
                search: z.string().optional(),
            })
        )
        .query(async ({ ctx, input }) => {
            const users = await ctx.prisma.user.findMany({
                where: {
                    ...(input.tenantId && { tenantId: input.tenantId }),
                    ...(input.role && { role: input.role }),
                    ...(input.search && {
                        OR: [
                            { name: { contains: input.search, mode: 'insensitive' } },
                            { email: { contains: input.search, mode: 'insensitive' } },
                        ],
                    }),
                },
                include: {
                    tenant: {
                        select: { id: true, name: true },
                    },
                    outlet: {
                        select: { id: true, name: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });

            return users;
        }),

    // Update user role
    updateUserRole: requireSuper
        .input(
            z.object({
                userId: z.string(),
                role: z.enum(['SUPER', 'BRAND_ADMIN', 'OUTLET_MANAGER', 'STAFF']),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const user = await ctx.prisma.user.update({
                where: { id: input.userId },
                data: { role: input.role },
                include: {
                    tenant: { select: { name: true } },
                },
            });

            return user;
        }),

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

    // Update tenant status
    updateTenantStatus: requireSuper
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
            return tenant;
        }),

    // Update tenant pricing
    updateTenantPricing: requireSuper
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

    // Suspend user
    suspendUser: requireSuper
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const user = await ctx.prisma.user.update({
                where: { id: input.userId },
                data: { isActive: false },
            });
            return user;
        }),

    // Activate user
    activateUser: requireSuper
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const user = await ctx.prisma.user.update({
                where: { id: input.userId },
                data: { isActive: true },
            });
            return user;
        }),

    // System Health
    getSystemHealth: requireSuper.query(async ({ ctx }) => {
        // Check DB connection
        const start = Date.now();
        await ctx.prisma.$queryRaw`SELECT 1`;
        const dbLatency = Date.now() - start;

        // Get some basic stats
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
    confirmPayment: requireSuper
        .input(z.object({ paymentId: z.string(), tenantId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            // 1. Update Payment Status
            const payment = await ctx.prisma.payment.update({
                where: { id: input.paymentId },
                data: { status: 'COMPLETED' },
            });

            // 2. Update Tenant Subscription
            // Extend by 1 month for now (can be made dynamic later)
            const tenant = await ctx.prisma.tenant.findUnique({ where: { id: input.tenantId } });
            const currentExpiry = tenant?.nextBillingDate || new Date();
            const nextBillingDate = new Date(currentExpiry);
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

            await ctx.prisma.tenant.update({
                where: { id: input.tenantId },
                data: {
                    subscriptionStatus: 'ACTIVE',
                    nextBillingDate: nextBillingDate,
                    status: 'ACTIVE', // Ensure tenant is active
                    isPaymentDue: false // Clear payment due flag
                },
            });

            return payment;
        }),

    // Request Payment (Set isPaymentDue = true)
    requestPayment: requireSuper
        .input(z.object({ tenantId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const tenant = await ctx.prisma.tenant.update({
                where: { id: input.tenantId },
                data: { isPaymentDue: true },
            });
            return tenant;
        }),

    // Delete Tenant
    deleteTenant: requireSuper
        .input(z.object({ tenantId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            // 1. Find Brand Admins for this tenant to cleanup
            const admins = await ctx.prisma.user.findMany({
                where: { tenantId: input.tenantId, role: 'BRAND_ADMIN' }
            });

            // 2. Delete tenant (cascading delete might handle some things, but cleaning users ensures email is freed)
            await ctx.prisma.tenant.delete({
                where: { id: input.tenantId },
            });

            // 3. Delete the users found (since they are now orphans and their emails are locked)
            // Only if they don't have other critical data (assumed safe for Brand Admin of deleted tenant)
            if (admins.length > 0) {
                await ctx.prisma.user.deleteMany({
                    where: { id: { in: admins.map(u => u.id) } }
                });
            }

            return { success: true };
        }),

    // Delete User
    deleteUser: requireSuper
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.prisma.user.delete({
                where: { id: input.userId },
            });
            return { success: true };
        }),

    // Get Overdue Tenants
    getOverdueTenants: requireSuper.query(async ({ ctx }) => {
        return ctx.prisma.tenant.findMany({
            where: { isPaymentDue: true },
            select: {
                id: true,
                name: true,
                // We'll just return basic info for now.
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

    // Record Manual Payment (Create Payment + Update Tenant)
    recordPayment: requireSuper
        .input(z.object({
            tenantId: z.string(),
            amount: z.number(),
            method: z.string(), // CASH, BANK_TRANSFER, UPI
            date: z.date(),
            notes: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            // 1. Create Payment Record
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

            // 2. Update Tenant Subscription
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

    // Invite Brand (Uses ProvisioningService)
    inviteBrand: requireSuper
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

            // Transactional Provisioning (Invite Brand Admin)
            const invite = await ProvisioningService.inviteBrandAdmin({
                email: input.email,
                name: input.contactName || 'Brand Admin',
                brandName: input.brandName,
                tenantId: tenant.id,
                superAdminClerkId: ctx.userId!, // Validated by middleware
                superAdminDbId: ctx.user.id
            });

            return { success: true, tenant, invite };
        }),

    // Generic Invite User
    inviteUser: requireSuper
        .input(z.object({
            email: z.string().email(),
            name: z.string().min(1),
            role: z.enum(['SUPER', 'BRAND_ADMIN', 'OUTLET_MANAGER', 'STAFF']),
            tenantId: z.string().optional(),
            outletId: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            // 1. Validation
            const existingUser = await ctx.prisma.user.findUnique({ where: { email: input.email } });
            if (existingUser) {
                throw new TRPCError({ code: 'CONFLICT', message: 'User already exists' });
            }

            if (input.role !== 'SUPER' && !input.tenantId) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant ID is required for non-super roles' });
            }

            // 2. Create Invitation
            const invite = await ctx.prisma.invitation.create({
                data: {
                    token: crypto.randomUUID(),
                    email: input.email,
                    inviteRole: input.role,
                    tenantId: input.tenantId,
                    outletId: input.outletId,
                    status: 'PENDING',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    createdById: ctx.user.id,
                    createdByRole: 'SUPER',
                    metadata: { name: input.name }
                },
                include: {
                    tenant: { select: { name: true } },
                    outlet: { select: { name: true } }
                }
            });

            // Send Email
            const entityName = invite.outlet?.name || invite.tenant?.name || 'Beloop Platform';
            await MailService.sendUserInvite(input.email, invite.token, input.role, entityName);

            return invite;
        }),

    // New ACID Brand Invitation (Phase 1)
    createBrandInvitation: requireSuper
        .input(z.object({
            brandName: z.string().min(1),
            email: z.string().email(),
        }))
        .mutation(async ({ ctx, input }) => {
            // 1. Generate Token
            const token = crypto.randomUUID();

            // 2. Persist to DB
            await ctx.prisma.brandInvitation.create({
                data: {
                    token,
                    brandName: input.brandName,
                    email: input.email,
                    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 Hours
                },
            });

            // 3. Send Email
            await MailService.sendBrandCreationInvite(input.email, token, input.brandName);

            // 4. Return Link
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            return {
                link: `${baseUrl}/invite/brand?token=${token}`,
                token
            };
        }),
});

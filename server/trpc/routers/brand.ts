import { z } from 'zod';
import { router, protectedProcedure, requireRole } from '../trpc';
import { TRPCError } from '@trpc/server';
import crypto from 'crypto';

// Brand Admin middleware - only BRAND_ADMIN and SUPER can access
const brandAdminProcedure = protectedProcedure.use(requireRole(['BRAND_ADMIN', 'SUPER']));

export const brandRouter = router({
    /**
     * List all users in the brand admin's tenant
     */
    listUsers: brandAdminProcedure
        .input(z.object({
            search: z.string().optional(),
            role: z.enum(['BRAND_ADMIN', 'OUTLET_MANAGER', 'STAFF']).optional(),
            outletId: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            if (!ctx.user.tenantId) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'No tenant found' });
            }

            return ctx.prisma.user.findMany({
                where: {
                    tenantId: ctx.user.tenantId,
                    id: { not: ctx.user.id }, // Exclude self
                    ...(input.search && {
                        OR: [
                            { name: { contains: input.search, mode: 'insensitive' } },
                            { email: { contains: input.search, mode: 'insensitive' } },
                        ]
                    }),
                    ...(input.role && { role: input.role }),
                    ...(input.outletId && { outletId: input.outletId }),
                },
                include: {
                    outlet: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
            });
        }),

    /**
     * Suspend a user (set isActive = false)
     */
    suspendUser: brandAdminProcedure
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            // Verify user belongs to same tenant
            const targetUser = await ctx.prisma.user.findFirst({
                where: { id: input.userId, tenantId: ctx.user.tenantId }
            });

            if (!targetUser) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
            }

            if (targetUser.role === 'BRAND_ADMIN') {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot suspend another Brand Admin' });
            }

            return ctx.prisma.user.update({
                where: { id: input.userId },
                data: { isActive: false },
            });
        }),

    /**
     * Unsuspend a user (set isActive = true)
     */
    unsuspendUser: brandAdminProcedure
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const targetUser = await ctx.prisma.user.findFirst({
                where: { id: input.userId, tenantId: ctx.user.tenantId }
            });

            if (!targetUser) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
            }

            return ctx.prisma.user.update({
                where: { id: input.userId },
                data: { isActive: true },
            });
        }),

    /**
     * Delete a user from the brand
     */
    deleteUser: brandAdminProcedure
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const targetUser = await ctx.prisma.user.findFirst({
                where: { id: input.userId, tenantId: ctx.user.tenantId }
            });

            if (!targetUser) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
            }

            if (targetUser.role === 'BRAND_ADMIN') {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot delete another Brand Admin' });
            }

            // Optionally unlink from Clerk org
            if (targetUser.clerkId) {
                try {
                    const client = await import('@clerk/nextjs/server').then(m => m.clerkClient());
                    const tenant = await ctx.prisma.tenant.findUnique({ where: { id: ctx.user.tenantId! }, select: { clerkOrgId: true } });
                    if (tenant?.clerkOrgId) {
                        // Get membership and remove
                        const memberships = await client.organizations.getOrganizationMembershipList({ organizationId: tenant.clerkOrgId });
                        const membership = memberships.data.find(m => m.publicUserData?.userId === targetUser.clerkId);
                        if (membership) {
                            await client.organizations.deleteOrganizationMembership({
                                organizationId: tenant.clerkOrgId,
                                userId: targetUser.clerkId,
                            });
                        }
                    }
                } catch (e) {
                    console.error('Failed to remove from Clerk org:', e);
                }
            }

            return ctx.prisma.user.delete({
                where: { id: input.userId },
            });
        }),

    /**
     * List outlets for the brand
     */
    listOutlets: brandAdminProcedure
        .query(async ({ ctx }) => {
            if (!ctx.user.tenantId) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'No tenant found' });
            }

            return ctx.prisma.outlet.findMany({
                where: { tenantId: ctx.user.tenantId },
                include: {
                    _count: { select: { users: true, products: true } },
                },
                orderBy: { createdAt: 'desc' },
            });
        }),

    /**
     * Create a new outlet
     */
    createOutlet: brandAdminProcedure
        .input(z.object({
            name: z.string().min(1),
            code: z.string().min(1),
            address: z.string().optional(),
            phone: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            if (!ctx.user.tenantId) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'No tenant found' });
            }

            // Check code uniqueness
            const existing = await ctx.prisma.outlet.findFirst({
                where: { tenantId: ctx.user.tenantId, code: input.code }
            });

            if (existing) {
                throw new TRPCError({ code: 'CONFLICT', message: 'Outlet code already exists' });
            }

            return ctx.prisma.outlet.create({
                data: {
                    ...input,
                    tenantId: ctx.user.tenantId,
                    status: 'ACTIVE',
                },
            });
        }),

    /**
     * Update outlet status (suspend/activate)
     */
    updateOutletStatus: brandAdminProcedure
        .input(z.object({
            outletId: z.string(),
            status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']),
        }))
        .mutation(async ({ ctx, input }) => {
            const outlet = await ctx.prisma.outlet.findFirst({
                where: { id: input.outletId, tenantId: ctx.user.tenantId }
            });

            if (!outlet) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Outlet not found' });
            }

            return ctx.prisma.outlet.update({
                where: { id: input.outletId },
                data: { status: input.status },
            });
        }),

    /**
     * Delete an outlet
     */
    deleteOutlet: brandAdminProcedure
        .input(z.object({ outletId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const outlet = await ctx.prisma.outlet.findFirst({
                where: { id: input.outletId, tenantId: ctx.user.tenantId }
            });

            if (!outlet) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Outlet not found' });
            }

            // Soft delete: set status to ARCHIVED
            return ctx.prisma.outlet.update({
                where: { id: input.outletId },
                data: { status: 'ARCHIVED' },
            });
        }),

    /**
     * Invite a user to the brand
     */
    inviteUser: brandAdminProcedure
        .input(z.object({
            email: z.string().email(),
            role: z.enum(['OUTLET_MANAGER', 'STAFF']),
            outletId: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            if (!ctx.user.tenantId) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'No tenant found' });
            }

            // Verify outlet belongs to tenant
            const outlet = await ctx.prisma.outlet.findFirst({
                where: { id: input.outletId, tenantId: ctx.user.tenantId },
                select: { name: true }
            });

            if (!outlet) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Outlet not found' });
            }

            // Check for existing invitation
            const existing = await ctx.prisma.invitation.findFirst({
                where: {
                    email: input.email,
                    outletId: input.outletId,
                    status: 'PENDING',
                }
            });

            if (existing) {
                return { success: true, message: 'Invitation already pending', id: existing.id };
            }

            // Create invitation
            const token = crypto.randomUUID();
            const invitation = await ctx.prisma.invitation.create({
                data: {
                    token,
                    email: input.email,
                    inviteRole: input.role,
                    tenantId: ctx.user.tenantId,
                    outletId: input.outletId,
                    createdById: ctx.user.id,
                    createdByRole: ctx.user.role,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                },
            });

            // Create Clerk org invitation
            try {
                const tenant = await ctx.prisma.tenant.findUnique({
                    where: { id: ctx.user.tenantId },
                    select: { clerkOrgId: true }
                });

                if (tenant?.clerkOrgId) {
                    const client = await import('@clerk/nextjs/server').then(m => m.clerkClient());
                    await client.organizations.createOrganizationInvitation({
                        organizationId: tenant.clerkOrgId,
                        emailAddress: input.email,
                        role: 'org:member',
                        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite`,
                        publicMetadata: { internalInviteId: invitation.id }
                    });
                }
            } catch (e) {
                console.error('Failed to create Clerk invitation:', e);
            }

            return { success: true, message: 'Invitation sent', id: invitation.id };
        }),
});

/**
 * Super Admin - Users Router
 * Handles all user management operations
 */
import { z } from 'zod';
import { router, requireSuper } from '../../trpc';
import { TRPCError } from '@trpc/server';
import { MailService } from '@/server/services/mail.service';
import crypto from 'crypto';

export const usersRouter = router({
    // List all users across all tenants
    list: requireSuper
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
    updateRole: requireSuper
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

    // Suspend user
    suspend: requireSuper
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const user = await ctx.prisma.user.update({
                where: { id: input.userId },
                data: { isActive: false },
            });
            return user;
        }),

    // Activate user
    activate: requireSuper
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const user = await ctx.prisma.user.update({
                where: { id: input.userId },
                data: { isActive: true },
            });
            return user;
        }),

    // Delete User
    delete: requireSuper
        .input(z.object({ userId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const user = await ctx.prisma.user.findUnique({
                where: { id: input.userId },
                select: { clerkId: true, id: true, email: true }
            });

            if (!user) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
            }

            try {
                await ctx.prisma.$transaction(async (tx) => {
                    await tx.sale.deleteMany({ where: { staffId: input.userId } });
                    await tx.expense.deleteMany({ where: { staffId: input.userId } });
                    await tx.purchaseOrder.updateMany({
                        where: { createdBy: input.userId },
                        data: { createdBy: null }
                    });
                    await tx.stockVerification.deleteMany({ where: { verifiedBy: input.userId } });
                    await tx.stockCheck.deleteMany({ where: { performedBy: input.userId } });
                    await tx.ticket.deleteMany({ where: { userId: input.userId } });
                    await tx.ticketComment.deleteMany({ where: { userId: input.userId } });
                    await tx.auditLog.deleteMany({ where: { userId: input.userId } });
                    await tx.temporaryPassword.deleteMany({ where: { userId: input.userId } });
                    await tx.user.delete({ where: { id: input.userId } });
                });

                if (user.clerkId) {
                    try {
                        const { clerkClient } = await import('@clerk/nextjs/server');
                        const client = await clerkClient();
                        await client.users.deleteUser(user.clerkId);
                    } catch {
                        console.log(`[SUPER] Clerk user ${user.clerkId} may not exist`);
                    }
                }

                return { success: true, message: `User ${user.email} deleted successfully` };
            } catch (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`
                });
            }
        }),

    // Invite User
    invite: requireSuper
        .input(z.object({
            email: z.string().email(),
            name: z.string().min(1),
            role: z.enum(['SUPER', 'BRAND_ADMIN', 'OUTLET_MANAGER', 'STAFF']),
            tenantId: z.string().optional(),
            outletId: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const existingUser = await ctx.prisma.user.findUnique({ where: { email: input.email } });
            if (existingUser) {
                throw new TRPCError({ code: 'CONFLICT', message: 'User already exists' });
            }

            if (input.role !== 'SUPER' && !input.tenantId) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant ID is required for non-super roles' });
            }

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

            const entityName = invite.outlet?.name || invite.tenant?.name || 'Beloop Platform';
            await MailService.sendUserInvite(input.email, invite.token, input.role, entityName);

            return invite;
        }),
});

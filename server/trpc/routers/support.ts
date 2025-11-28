import { z } from 'zod';
import { router, protectedProcedure, requireSuper } from '../trpc';
import { TRPCError } from '@trpc/server';

export const supportRouter = router({
    // --- Common Procedures ---

    createTicket: protectedProcedure
        .input(
            z.object({
                subject: z.string().min(1, 'Subject is required'),
                description: z.string().min(1, 'Description is required'),
                priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
                category: z.enum(['BUG', 'FEATURE', 'BILLING', 'OTHER']),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { user } = ctx;
            if (!user.tenantId) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'User must belong to a tenant to create a ticket',
                });
            }

            return ctx.prisma.ticket.create({
                data: {
                    tenantId: user.tenantId,
                    userId: user.id,
                    subject: input.subject,
                    description: input.description,
                    priority: input.priority,
                    category: input.category,
                    status: 'OPEN',
                },
            });
        }),

    addComment: protectedProcedure
        .input(
            z.object({
                ticketId: z.string(),
                content: z.string().min(1, 'Comment cannot be empty'),
                isInternal: z.boolean().default(false),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { user } = ctx;

            // Verify access
            const ticket = await ctx.prisma.ticket.findUnique({
                where: { id: input.ticketId },
            });

            if (!ticket) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Ticket not found' });
            }

            const isSuper = user.role === 'SUPER';
            const isOwner = ticket.userId === user.id;
            const isTenantAdmin = user.role === 'BRAND_ADMIN' && ticket.tenantId === user.tenantId;

            if (!isSuper && !isOwner && !isTenantAdmin) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
            }

            // Only Super Admins can make internal comments
            if (input.isInternal && !isSuper) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Only admins can make internal comments',
                });
            }

            return ctx.prisma.ticketComment.create({
                data: {
                    ticketId: input.ticketId,
                    userId: user.id,
                    content: input.content,
                    isInternal: input.isInternal,
                },
            });
        }),

    getTicketDetails: protectedProcedure
        .input(z.object({ ticketId: z.string() }))
        .query(async ({ ctx, input }) => {
            const { user } = ctx;
            const ticket = await ctx.prisma.ticket.findUnique({
                where: { id: input.ticketId },
                include: {
                    user: {
                        select: { id: true, name: true, email: true, role: true },
                    },
                    tenant: {
                        select: { id: true, name: true, slug: true },
                    },
                    comments: {
                        include: {
                            user: {
                                select: { id: true, name: true, role: true },
                            },
                        },
                        orderBy: { createdAt: 'asc' },
                    },
                },
            });

            if (!ticket) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Ticket not found' });
            }

            const isSuper = user.role === 'SUPER';
            const isTenantUser = ticket.tenantId === user.tenantId;

            if (!isSuper && !isTenantUser) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized' });
            }

            // Filter out internal comments for non-super users
            if (!isSuper) {
                ticket.comments = ticket.comments.filter((c) => !c.isInternal);
            }

            return ticket;
        }),

    // --- Super Admin Procedures ---

    getAllTickets: requireSuper
        .input(
            z.object({
                status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
                priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
                tenantId: z.string().optional(),
                limit: z.number().min(1).max(100).default(50),
                cursor: z.string().nullish(), // For pagination
            })
        )
        .query(async ({ ctx, input }) => {
            const { limit, cursor, status, priority, tenantId } = input;

            const items = await ctx.prisma.ticket.findMany({
                take: limit + 1,
                cursor: cursor ? { id: cursor } : undefined,
                where: {
                    status,
                    priority,
                    tenantId,
                },
                include: {
                    tenant: { select: { name: true, slug: true } },
                    user: { select: { name: true, email: true } },
                    _count: { select: { comments: true } },
                },
                orderBy: { createdAt: 'desc' },
            });

            let nextCursor: typeof cursor | undefined = undefined;
            if (items.length > limit) {
                const nextItem = items.pop();
                nextCursor = nextItem!.id;
            }

            return {
                items,
                nextCursor,
            };
        }),

    updateTicketStatus: requireSuper
        .input(
            z.object({
                ticketId: z.string(),
                status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
            })
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.prisma.ticket.update({
                where: { id: input.ticketId },
                data: { status: input.status },
            });
        }),

    // --- Tenant User Procedures ---

    getMyTickets: protectedProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(50).default(20),
                cursor: z.string().nullish(),
            })
        )
        .query(async ({ ctx, input }) => {
            const { user } = ctx;
            if (!user.tenantId) return { items: [], nextCursor: undefined };

            const { limit, cursor } = input;

            // Determine visibility based on role
            // Brand Admins see all tenant tickets
            // Others see only their own
            const isBrandAdmin = user.role === 'BRAND_ADMIN';

            const items = await ctx.prisma.ticket.findMany({
                take: limit + 1,
                cursor: cursor ? { id: cursor } : undefined,
                where: {
                    tenantId: user.tenantId,
                    ...(!isBrandAdmin ? { userId: user.id } : {}),
                },
                include: {
                    _count: { select: { comments: true } },
                },
                orderBy: { createdAt: 'desc' },
            });

            let nextCursor: typeof cursor | undefined = undefined;
            if (items.length > limit) {
                const nextItem = items.pop();
                nextCursor = nextItem!.id;
            }

            return {
                items,
                nextCursor,
            };
        }),
});

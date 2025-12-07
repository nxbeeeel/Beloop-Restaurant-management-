
import { z } from 'zod';
import { router, publicProcedure, requireSuper } from '../trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';

export const brandApplicationRouter = router({
    submit: publicProcedure
        .input(z.object({
            brandName: z.string().min(1),
            contactName: z.string().min(1),
            email: z.string().email(),
            phone: z.string().min(10),
            estimatedOutlets: z.number().min(1),
        }))
        .mutation(async ({ input }) => {
            return prisma.brandApplication.create({
                data: {
                    ...input,
                    status: 'PENDING',
                },
            });
        }),

    list: requireSuper
        .query(async () => {
            return prisma.brandApplication.findMany({
                orderBy: { createdAt: 'desc' },
            });
        }),

    approve: requireSuper
        .input(z.object({
            id: z.string(),
        }))
        .mutation(async ({ input }) => {
            const application = await prisma.brandApplication.findUnique({
                where: { id: input.id },
            });

            if (!application) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Application not found' });
            }

            if (application.status !== 'PENDING') {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Application is not pending' });
            }

            // 1. Create Brand Invitation (Phase 1 of ACID Flow)
            const token = crypto.randomUUID();

            await prisma.brandInvitation.create({
                data: {
                    token,
                    brandName: application.brandName,
                    email: application.email,
                    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 Hours
                }
            });

            // 2. Update Application Status
            await prisma.brandApplication.update({
                where: { id: input.id },
                data: { status: 'APPROVED' },
            });

            // 3. Return Link for Display
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const link = `${baseUrl}/invite/brand?token=${token}`;

            return {
                actionTaken: 'INVITE_GENERATED',
                invite: { token, link },
                // Mock tenant object for frontend compatibility showing "Tenant Created" message, 
                // though strictly it's "Tenant Reserved" now.
                tenant: { name: application.brandName }
            };
        }),

    reject: requireSuper
        .input(z.object({
            id: z.string(),
        }))
        .mutation(async ({ input }) => {
            return prisma.brandApplication.update({
                where: { id: input.id },
                data: { status: 'REJECTED' },
            });
        }),

    getInvite: requireSuper
        .input(z.object({
            id: z.string()
        }))
        .query(async ({ input }) => {
            const app = await prisma.brandApplication.findUnique({
                where: { id: input.id },
                select: { email: true }
            });

            if (!app) return null;

            const invite = await prisma.invitation.findFirst({
                where: {
                    email: app.email,
                    status: 'PENDING'
                },
                orderBy: { createdAt: 'desc' }
            });

            return invite;
        }),
});

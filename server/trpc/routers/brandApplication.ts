
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

            // Check if email already used (basic check, though User model has unique email)
            const existingUser = await prisma.user.findUnique({ where: { email: application.email } });
            if (existingUser) {
                // Handle edge case or just error. 
                // For MVP, if user exists, maybe we just add them to the tenant? 
                // But here we are creating a BRAND, so it's a new tenant.
                // Let's error for now.
                throw new TRPCError({ code: 'CONFLICT', message: 'User with this email already exists' });
            }

            // 1. Create Tenant
            // Slug generation: simple cleanup
            let slug = application.brandName.toLowerCase().replace(/[^a-z0-9]/g, '-');
            // Ensure uniqueness (simple retry or random suffix could be added, keeping it simple for now)
            const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
            if (existingTenant) {
                slug = `${slug}-${Date.now()}`;
            }

            const tenant = await prisma.tenant.create({
                data: {
                    name: application.brandName,
                    slug: slug,
                    pricePerOutlet: 250,
                    status: 'ACTIVE',
                },
            });

            // 2. Create Invite for the user
            const invite = await prisma.invitation.create({
                data: {
                    token: crypto.randomUUID(),
                    email: application.email,
                    tenantId: tenant.id,
                    inviteRole: 'BRAND_ADMIN',
                    status: 'PENDING',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                    createdById: 'system', // or ctx.user.id
                    createdByRole: 'SUPER',
                },
            });

            // 3. Update Application Status
            await prisma.brandApplication.update({
                where: { id: input.id },
                data: { status: 'APPROVED' },
            });

            return { tenant, invite };
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
});

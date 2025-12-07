
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

            // 1. Create Tenant
            // Slug generation: simple cleanup
            let slug = application.brandName.toLowerCase().replace(/[^a-z0-9]/g, '-');
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

            // 2. Handle User (Existing vs New)
            const existingUser = await prisma.user.findUnique({ where: { email: application.email } });
            let invite = null;
            let actionTaken = 'INVITED'; // or 'ASSIGNED'

            if (existingUser) {
                // User exists: Direct assignment
                await prisma.user.update({
                    where: { id: existingUser.id },
                    data: {
                        role: 'BRAND_ADMIN',
                        tenantId: tenant.id,
                        isActive: true
                    }
                });
                actionTaken = 'ASSIGNED';
            } else {
                // User does not exist: Create Invitation
                invite = await prisma.invitation.create({
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
            }

            // 3. Update Application Status
            await prisma.brandApplication.update({
                where: { id: input.id },
                data: { status: 'APPROVED' },
            });

            return { tenant, invite, actionTaken };
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

import { prisma } from '@/server/db';
import { clerkClient } from '@clerk/nextjs/server';
import { MailService } from './mail.service';
import { TRPCError } from '@trpc/server';
import crypto from 'crypto';

/**
 * ATOMIC PROVISIONING SERVICE & ZERO-TRUST AUTHORITY
 * --------------------------------------------------
 * This service is the SINGLE SOURCE OF TRUTH for Creating/Updating Users and Tenants.
 * It enforces the "Trinity of Sync":
 * 1. Database Record (Prisma)
 * 2. Auth Metadata (Clerk - Now with Organizations)
 * 3. User Notification (Email via Clerk or MailService)
 * 
 * If any critical step fails, we attempt to rollback or alert.
 */
export class ProvisioningService {

    /**
     * Invite a new Brand Admin (Atomic Operation with Clerk Org)
     */
    static async inviteBrandAdmin(input: {
        email: string;
        name: string;
        brandName: string;
        tenantId: string;
        superAdminId: string;
    }) {
        console.log(`[Provisioning] Starting atomic CLERK invite for ${input.email}`);

        // 1. DB: Create Invitation Trigger (audit trail)
        // We still keep our DB invite for tracking, but the "Real" invite is Clerk's.
        const invite = await prisma.invitation.create({
            data: {
                token: crypto.randomUUID(), // Internal token
                email: input.email,
                tenantId: input.tenantId,
                inviteRole: 'BRAND_ADMIN',
                status: 'PENDING',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                createdById: input.superAdminId,
                createdByRole: 'SUPER',
                metadata: { contactName: input.name }
            }
        });

        const client = await clerkClient();

        try {
            // 2. Create Clerk Organization
            // Slugify brand name
            const slug = input.brandName.toLowerCase().replace(/[^a-z0-9]/g, '-');
            // Ensure unique slug by appending simplified timestamp/random
            const uniqueSlug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;

            const org = await client.organizations.createOrganization({
                name: input.brandName,
                slug: uniqueSlug,
                createdBy: input.superAdminId, // The Super Admin creates it
            });

            // 3. Update DB Tenant with Clerk Org ID
            await prisma.tenant.update({
                where: { id: input.tenantId },
                data: { clerkOrgId: org.id }
            });

            // 4. Send Clerk Invitation
            // This sends the email from Clerk.
            await client.organizations.createOrganizationInvitation({
                organizationId: org.id,
                emailAddress: input.email,
                role: 'org:admin', // Map BRAND_ADMIN to org:admin
                redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite`
            });

            console.log(`[Provisioning] Clerk Org created (${org.id}) and Invite sent to ${input.email}`);

        } catch (error: any) {
            console.error("[Provisioning] Clerk Operation Failed. Rolling back DB.", error);

            // Rollback DB Invitation
            await prisma.invitation.delete({ where: { id: invite.id } });

            // Mark Tenant as Suspended/Failed (caller should delete ideally, but we mark it here)
            await prisma.tenant.update({
                where: { id: input.tenantId },
                data: { status: 'SUSPENDED' }
            });

            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to create Clerk Organization or Send Invite: ${error.message || 'Unknown error'}`
            });
        }

        return invite;
    }

    /**
     * @deprecated
     * Legacy provisioning logic.
     * New flow is handled by `app/(public)/accept-invite/page.tsx` which handles Clerk Org acceptance + DB Sync.
     */
    static async provisionUserFromInvite(params: {
        userId: string;
        email: string;
        name: string;
        inviteToken: string;
    }) {
        // ... (Keep existing logic or throw error if we want to strictly enforce new way)
        // For now, we keep it if any legacy links are clicked.
        const { userId, email, name, inviteToken } = params;

        // ... (Existing implementation kept for safety)
        const result = await prisma.$transaction(async (tx) => {
            const invite = await tx.invitation.findUnique({
                where: { token: inviteToken },
                include: { tenant: true }
            });

            if (!invite || invite.status !== 'PENDING') {
                throw new Error("Invalid or Expired Invitation");
            }

            const mappedUser = await tx.user.upsert({
                where: { email },
                update: {
                    clerkId: userId,
                    role: invite.inviteRole,
                    tenantId: invite.tenantId,
                    outletId: invite.outletId,
                    isActive: true,
                    name: name
                },
                create: {
                    email,
                    clerkId: userId,
                    role: invite.inviteRole,
                    tenantId: invite.tenantId,
                    outletId: invite.outletId,
                    isActive: true,
                    name: name
                }
            });

            await tx.invitation.update({
                where: { id: invite.id },
                data: { status: 'ACCEPTED', acceptedAt: new Date(), acceptedBy: userId }
            });

            return { user: mappedUser, invite };
        });

        return result;
    }
}

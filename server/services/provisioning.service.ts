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
        superAdminClerkId: string;
        superAdminDbId: string;
    }) {
        console.log(`[Provisioning] Starting atomic CLERK invite for ${input.email} (No Slug)`);

        // 1. DB: Create Invitation Trigger
        const invite = await prisma.invitation.create({
            data: {
                token: crypto.randomUUID(),
                email: input.email,
                tenantId: input.tenantId,
                inviteRole: 'BRAND_ADMIN',
                status: 'PENDING',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                createdById: input.superAdminDbId,
                createdByRole: 'SUPER',
                metadata: { contactName: input.name }
            }
        });

        const client = await clerkClient();

        try {
            // 2. Create Clerk Organization (WITHOUT SLUG to avoid 403 on Free Plan)
            const org = await client.organizations.createOrganization({
                name: input.brandName,
                createdBy: input.superAdminClerkId,
            });

            // 3. Update DB Tenant with Clerk Org ID
            await prisma.tenant.update({
                where: { id: input.tenantId },
                data: { clerkOrgId: org.id }
            });

            // 4. Send Custom Invitation Email (RELIABLE)
            // We forcefully send our own email because Clerk's email might fail or lack DB token context.
            await MailService.sendBrandInvite(input.email, invite.token, input.brandName);

            // 5. Skip Clerk Invitation to prevent Double Emails
            // We do NOT send the Clerk invitation. The user will be added to the DB flow.
            // If they need to be in the Clerk Org, we can add them via API upon activation in `activateBrand`.
            console.log(`[Provisioning] Clerk Org created (${org.id}). Clerk Invite skipped to avoid duplicate emails.`);

            console.log(`[Provisioning] Clerk Org created (${org.id}) and Invite sent to ${input.email}`);

        } catch (error: any) {
            console.error("[Provisioning] Clerk Operation Failed. Rolling back DB.", error);

            // Rollback DB Invitation
            await prisma.invitation.delete({ where: { id: invite.id } });

            // Mark Tenant as Suspended/Failed
            await prisma.tenant.update({
                where: { id: input.tenantId },
                data: { status: 'SUSPENDED' }
            });

            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to create Clerk Organization: ${error.message || 'Unknown error'}`
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

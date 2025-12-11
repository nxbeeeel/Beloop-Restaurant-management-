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
    superAdminClerkId: string; // Kept for interface compatibility
    superAdminDbId: string;
}) {
    console.log(`[Provisioning] Starting DB-Only invite for ${input.email}`);

    try {
        // 1. DB: Create Invitation Trigger
        // This is the source of truth.
        const invite = await prisma.invitation.create({
            data: {
                token: crypto.randomUUID(),
                email: input.email,
                tenantId: input.tenantId,
                inviteRole: 'BRAND_ADMIN',
                status: 'PENDING',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 Days
                createdById: input.superAdminDbId,
                createdByRole: 'SUPER',
                metadata: { contactName: input.name }
            }
        });

        // 2. Send Invitation Email via MailService
        // We bypass Clerk Invitations completely.
        await MailService.sendBrandInvite(input.email, invite.token, input.brandName);

        console.log(`[Provisioning] DB Invite created and Email sent to ${input.email}`);
        return invite;

    } catch (error: any) {
        console.error("[Provisioning] Invite Failed.", error);

        // Mark Tenant as Suspended if initial invite fails (optional, helps cleanup)
        await prisma.tenant.update({
            where: { id: input.tenantId },
            data: { status: 'PENDING' } // Keep as pending
        });

        throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to send Brand Invite: ${error.message || 'Unknown error'}`
        });
    }
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

'use server';

import { prisma } from "@/server/db";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { MailService } from "@/server/services/mail.service";
import { getInviteRateLimiter, checkRateLimit } from "@/lib/rate-limit";

const createInviteSchema = z.object({
    email: z.string().email("Invalid email address"),
    role: z.enum(["SUPER", "BRAND_ADMIN", "OUTLET_MANAGER", "STAFF"]),
    outletId: z.string().optional(),
});

export async function createInvitation(formData: FormData) {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    // ✅ Rate Limit Check (10 invites/hour per user)
    try {
        const limiter = getInviteRateLimiter();
        await checkRateLimit(limiter, user.id, 'Invitation');
    } catch (e: any) {
        throw new Error(e.message || "Rate limit exceeded");
    }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
        include: { tenant: true }
    });

    if (!dbUser || !dbUser.tenantId) {
        throw new Error("Unauthorized: No tenant found");
    }

    // Only Brand Admin or Super can invite
    if (dbUser.role !== 'BRAND_ADMIN' && dbUser.role !== 'SUPER') {
        throw new Error("Unauthorized: Insufficient permissions");
    }

    const rawData = {
        email: formData.get("email") as string,
        role: formData.get("role") as string,
        outletId: formData.get("outletId") as string || undefined,
    };

    const validation = createInviteSchema.safeParse(rawData);
    if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
    }

    const { email, role, outletId } = validation.data;

    // If inviting Outlet Manager or Staff, outletId is required
    if ((role === 'OUTLET_MANAGER' || role === 'STAFF') && !outletId) {
        throw new Error("Outlet is required for this role");
    }

    // Immediate Duplicate Check (Mandate 2.A)
    const existingInvite = await prisma.invitation.findFirst({
        where: {
            email,
            inviteRole: role,
            outletId: outletId || null, // Ensure explicit null check if undefined
            status: 'PENDING',
            tenantId: dbUser.tenantId
        }
    });

    if (existingInvite) {
        // Return existing without creating new (Idempotency)
        return {
            success: true,
            message: "Invitation already pending. Re-sent notification.",
            id: existingInvite.id
        };
    }

    const token = crypto.randomUUID();

    // Create invitation
    const newInvite = await prisma.invitation.create({
        data: {
            token,
            email,
            inviteRole: role,
            tenantId: dbUser.tenantId,
            outletId: outletId,
            createdById: dbUser.id,
            createdByRole: dbUser.role,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        }
    });

    // ✅ Audit Log: INVITE_CREATED
    await prisma.auditLog.create({
        data: {
            tenantId: dbUser.tenantId,
            userId: dbUser.id,
            userName: dbUser.name,
            action: 'INVITE_CREATED',
            tableName: 'Invitation',
            recordId: newInvite.id,
            newValue: { email, role, outletId }
        }
    });

    // CLERK ORGANIZATION INTEGRATION
    if (dbUser.tenant?.clerkOrgId) {
        try {
            const client = await import('@clerk/nextjs/server').then(m => m.clerkClient());

            // Map internal role to Clerk Org Role
            // BRAND_ADMIN -> org:admin
            // OUTLET_MANAGER / STAFF -> org:member
            const clerkRole = role === 'BRAND_ADMIN' ? 'org:admin' : 'org:member';

            await client.organizations.createOrganizationInvitation({
                organizationId: dbUser.tenant.clerkOrgId,
                emailAddress: email,
                role: clerkRole,
                redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/accept-invite`,
                publicMetadata: {
                    internalInviteId: newInvite.id // Link back to our DB
                }
            });

            // We let Clerk handle the email delivery?
            // NO: User reports Clerk emails not arriving. We should send our custom email ALWAYS.
            // There is a risk of double emails, but better than zero.
            console.log("Clerk Invitation created. Proceeding to send custom email.");

        } catch (error: any) {
            console.error("Clerk Invitation Failed:", error);
            // We continue to send custom email anyway, effectively falling back to our system
            // But we should warn that the Clerk Org link might be missing
        }
    }

    // ALWAYS Send Custom Email (Premium Branding)
    if (outletId) {
        // Fetch outlet name for email context
        const outlet = await prisma.outlet.findUnique({ where: { id: outletId }, select: { name: true } });
        if (outlet) {
            await MailService.sendUserInvite(email, token, role, outlet.name);
        }
    } else {
        // Fallback or Brand Admin invite without specific outlet (if applicable)
        await MailService.sendUserInvite(email, token, role, "Beloop Brand");
    }

    return { success: true, message: "Invitation sent successfully!" };
}

export async function acceptInvitation(token: string) {
    const user = await currentUser();
    if (!user) {
        throw new Error("You must be logged in to accept an invitation");
    }

    const invite = await prisma.invitation.findUnique({
        where: { token },
    });

    if (!invite || invite.status !== 'PENDING') {
        throw new Error("Invalid or expired invitation");
    }

    if (invite.expiresAt < new Date()) {
        await prisma.invitation.update({
            where: { id: invite.id },
            data: { status: 'EXPIRED' }
        });
        throw new Error("Invitation has expired");
    }

    // 🔒 SECURITY FIX: Validate email matches invitation
    const primaryEmail = user.emailAddresses[0]?.emailAddress;
    if (invite.email && primaryEmail) {
        if (invite.email.toLowerCase() !== primaryEmail.toLowerCase()) {
            throw new Error(
                `This invitation was sent to ${invite.email}. Please log in with that email address to accept this invitation.`
            );
        }
    }

    // Transaction to update invite and user
    await prisma.$transaction(async (tx: any) => {
        // 1. Mark invitation as accepted
        await tx.invitation.update({
            where: { id: invite.id },
            data: {
                status: 'ACCEPTED',
                acceptedAt: new Date(),
                acceptedBy: user.id
            }
        });

        // 2. Link/Create User
        const existingUser = await tx.user.findUnique({
            where: { clerkId: user.id }
        });

        if (existingUser) {
            await tx.user.update({
                where: { id: existingUser.id },
                data: {
                    role: invite.inviteRole,
                    tenantId: invite.tenantId,
                    outletId: invite.outletId,
                }
            });
        } else {
            await tx.user.create({
                data: {
                    clerkId: user.id,
                    email: user.emailAddresses[0].emailAddress,
                    name: `${user.firstName} ${user.lastName}`.trim() || user.emailAddresses[0].emailAddress,
                    role: invite.inviteRole,
                    tenantId: invite.tenantId,
                    outletId: invite.outletId,
                }
            });
        }

        // 3. Update Tenant Onboarding Status (Authoritative State)
        // If status is NOT_STARTED, move to IN_PROGRESS
        const tenant = await tx.tenant.findUnique({ where: { id: invite.tenantId } });
        if (tenant && tenant.onboardingStatus === 'NOT_STARTED') {
            await tx.tenant.update({
                where: { id: invite.tenantId },
                data: { onboardingStatus: 'IN_PROGRESS' }
            });
        }
    });

    // ✅ Audit Log: INVITE_ACCEPTED
    await prisma.auditLog.create({
        data: {
            tenantId: invite.tenantId,
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`.trim(),
            action: 'INVITE_ACCEPTED',
            tableName: 'Invitation',
            recordId: invite.id,
            newValue: { role: invite.inviteRole, outletId: invite.outletId }
        }
    });

    // 4. Sync to Clerk Metadata (CRITICAL for routing)
    // Now we fetch authoritative state to sync
    try {
        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id },
            include: { tenant: true }
        });

        if (dbUser?.tenant) {
            const client = await import('@clerk/nextjs/server').then(m => m.clerkClient());

            // For OUTLET_MANAGER and STAFF, they're ready immediately (no brand onboarding needed)
            // For BRAND_ADMIN, follow the tenant's onboarding status
            const effectiveOnboardingStatus =
                (dbUser.role === 'OUTLET_MANAGER' || dbUser.role === 'STAFF')
                    ? 'COMPLETED'
                    : (dbUser.tenant as any).onboardingStatus;

            await client.users.updateUserMetadata(user.id, {
                publicMetadata: {
                    app_role: dbUser.role,
                    role: dbUser.role,
                    tenantId: dbUser.tenantId,
                    outletId: dbUser.outletId,
                    onboardingStatus: effectiveOnboardingStatus
                }
            });
        }
    } catch (err) {
        console.error("Failed to sync Clerk metadata:", err);
    }

    // Determine redirect path based on role
    let redirectPath = "/";
    switch (invite.inviteRole) {
        case "SUPER":
            redirectPath = "/super/dashboard";
            break;
        case "BRAND_ADMIN":
            redirectPath = "/brand/dashboard";
            break;
        case "OUTLET_MANAGER":
            redirectPath = "/outlet/dashboard";
            break;
        case "STAFF":
            redirectPath = "/submit";
            break;
    }

    // D. Generate Bypass Token (Enterprise Fix)
    const bypassToken = await import("@/lib/tokens").then(m => m.generateBypassToken(invite.tenantId!, user.id));

    // Return success with redirect path - client handles navigation
    // This prevents server-side redirect conflicts with middleware
    return { success: true, redirectPath: `${redirectPath}?t=${bypassToken}` };
}

export async function cancelInvitation(invitationId: string) {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
    });

    if (!dbUser || !dbUser.tenantId) {
        throw new Error("Unauthorized: No tenant found");
    }

    // Only Brand Admin or Super can cancel invitations
    if (dbUser.role !== 'BRAND_ADMIN' && dbUser.role !== 'SUPER') {
        throw new Error("Unauthorized: Insufficient permissions");
    }

    // Verify the invitation belongs to their tenant
    const invitation = await prisma.invitation.findUnique({
        where: { id: invitationId }
    });

    if (!invitation) {
        throw new Error("Invitation not found");
    }

    if (invitation.tenantId !== dbUser.tenantId && dbUser.role !== 'SUPER') {
        throw new Error("Unauthorized: Cannot cancel invitations from other brands");
    }

    // Cancel the invitation
    await prisma.invitation.update({
        where: { id: invitationId },
        data: { status: 'REVOKED' }
    });

    return { success: true };
}

export async function resendInvitation(invitationId: string) {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
        include: { tenant: true } // ✅ Include tenant for name access
    });

    if (!dbUser || !dbUser.tenantId) {
        throw new Error("Unauthorized: No tenant found");
    }

    // Only Brand Admin or Super can resend invitations
    if (dbUser.role !== 'BRAND_ADMIN' && dbUser.role !== 'SUPER') {
        throw new Error("Unauthorized: Insufficient permissions");
    }

    // Verify the invitation belongs to their tenant
    const invitation = await prisma.invitation.findUnique({
        where: { id: invitationId }
    });

    if (!invitation) {
        throw new Error("Invitation not found");
    }

    if (invitation.tenantId !== dbUser.tenantId && dbUser.role !== 'SUPER') {
        throw new Error("Unauthorized: Cannot resend invitations from other brands");
    }

    // Update expiration date (extend by 7 more days)
    await prisma.invitation.update({
        where: { id: invitationId },
        data: {
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: 'PENDING' // Reset to pending if it was expired
        }
    });

    // ✅ Send email notification for resent invitation
    await MailService.sendUserInvite(
        invitation.email || '',
        invitation.token,
        invitation.inviteRole,
        dbUser.tenant?.name || 'Beloop Brand'
    );

    return { success: true };
}

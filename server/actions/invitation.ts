'use server';

import { prisma } from "@/server/db";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { MailService } from "@/server/services/mail.service";

const createInviteSchema = z.object({
    email: z.string().email("Invalid email address"),
    role: z.enum(["SUPER", "BRAND_ADMIN", "OUTLET_MANAGER", "STAFF"]),
    outletId: z.string().optional(),
});

export async function createInvitation(formData: FormData) {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

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
    await prisma.invitation.create({
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

    // Send Email
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

    // Transaction to update invite and user
    await prisma.$transaction(async (tx: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => {
        await tx.invitation.update({
            where: { id: invite.id },
            data: {
                status: 'ACCEPTED',
                acceptedAt: new Date(),
                acceptedBy: user.id
            }
        });

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
    });

    // 3. Sync to Clerk Metadata (CRITICAL for POS Access)
    try {
        const client = await import('@clerk/nextjs/server').then(m => m.clerkClient());
        await client.users.updateUserMetadata(user.id, {
            publicMetadata: {
                role: invite.inviteRole,
                tenantId: invite.tenantId,
                outletId: invite.outletId,
                onboardingComplete: true
            }
        });
    } catch (err) {
        console.error("Failed to sync Clerk metadata:", err);
        // Don't block flow, but log error
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

    redirect(redirectPath);
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

    // TODO: Send email notification here
    // await sendInvitationEmail(invitation);

    return { success: true };
}

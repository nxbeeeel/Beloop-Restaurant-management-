import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { OrganizationSwitcher } from "@clerk/nextjs";

/**
 * Invitation Acceptance Handler
 * -----------------------------
 * This page is the destination for Clerk Organization Invitations.
 * When a user accepts an invite in their email (handled by Clerk), they land here.
 * 
 * Logic:
 * 1. Check if authenticated (Middleware enforces this or redirects to login).
 * 2. Check if they have an active Organization (`orgId`).
 * 3. If yes, sync the User record in our DB (ensure they exist and are linked).
 * 4. Redirect to the Brand Dashboard.
 */
export default async function AcceptInvitePage() {
    const { userId, orgId, orgSlug } = await auth();

    // 1. Auth Guard
    if (!userId) {
        return redirect("/login?redirect_url=/accept-invite");
    }

    // 2. Organization Context Guard
    // If they landed here but don't have an active org, they might need to select it or accept it via Clerk's UI?
    // Usually, clicking the email link accepts it automatically if configured, or asks them to join.
    if (!orgId || !orgSlug) {
        // Render a UI to help them switch or see pending invites
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center space-y-6">
                    <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900">Welcome to Beloop!</h1>
                    <p className="text-gray-600">
                        You're almost there. Please select the organization you were invited to join to continue.
                    </p>

                    <div className="flex justify-center py-4">
                        <OrganizationSwitcher
                            afterCreateOrganizationUrl="/brand/:slug/dashboard"
                            afterSelectOrganizationUrl="/brand/:slug/dashboard"
                            hidePersonal
                        />
                    </div>

                    <p className="text-sm text-gray-500">
                        If you don't see your organization, please check your email for the invitation link again.
                    </p>
                </div>
            </div>
        );
    }

    // 3. User Sync (Zero-Trust Validation)
    try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        const email = user.emailAddresses[0]?.emailAddress;

        if (email) {
            // Find tenant by Clerk Org ID
            const tenant = await prisma.tenant.findUnique({
                where: { clerkOrgId: orgId }
            });

            if (tenant) {
                // A. Check for specific Permission/Role Invitation in our DB
                // This allows us to map "Clerk Member" -> "Outlet Manager" or "Staff"
                const pendingInvite = await prisma.invitation.findFirst({
                    where: {
                        tenantId: tenant.id,
                        email: email,
                        status: 'PENDING'
                    },
                    orderBy: { createdAt: 'desc' } // Get latest
                });

                // Determine Role & Outlet
                const role = pendingInvite?.inviteRole || "STAFF"; // Default to STAFF if no specific invite found
                const outletId = pendingInvite?.outletId || null;

                // B. Upsert User
                await prisma.user.upsert({
                    where: { email },
                    update: {
                        clerkId: userId,
                        tenantId: tenant.id,
                        role: role as any,
                        outletId: outletId,
                        isActive: true
                    },
                    create: {
                        email,
                        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || email.split('@')[0],
                        clerkId: userId,
                        tenantId: tenant.id,
                        role: role as any,
                        outletId: outletId,
                        isActive: true
                    }
                });

                // C. Mark Invitation as Accepted if it existed
                if (pendingInvite) {
                    await prisma.invitation.update({
                        where: { id: pendingInvite.id },
                        data: {
                            status: 'ACCEPTED',
                            acceptedAt: new Date(),
                            acceptedBy: userId
                        }
                    });
                }

                // D. Sync Clerk Public Metadata (for Middleware/Client ease)
                await client.users.updateUserMetadata(userId, {
                    publicMetadata: {
                        role: role,
                        tenantId: tenant.id,
                        outletId: outletId,
                        onboardingComplete: true
                    }
                });
            }
        }
    } catch (e) {
        console.error("Failed to sync user on acceptance:", e);
    }

    // 4. Redirect to Dashboard
    redirect(`/brand/${orgSlug}/dashboard`);
}

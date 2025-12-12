import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { OrganizationSwitcher } from "@clerk/nextjs";

/**
 * Invitation Acceptance Handler - Premium UI
 */
export default async function AcceptInvitePage() {
    const { userId, orgId, orgSlug } = await auth();

    // 1. Auth Guard
    if (!userId) {
        return redirect("/login?redirect_url=/accept-invite");
    }

    // 2. Organization Context Guard
    if (!orgId || !orgSlug) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 flex items-center justify-center p-4">
                {/* Background decoration */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-600/5 rounded-full blur-3xl" />
                </div>

                <div className="relative bg-stone-900/80 backdrop-blur-xl border border-stone-800 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center space-y-6">
                    {/* Logo */}
                    <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold text-white">Welcome to Beloop</h1>
                        <p className="text-stone-400 text-lg">
                            Select your organization to continue
                        </p>
                    </div>

                    <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-700">
                        <OrganizationSwitcher
                            afterCreateOrganizationUrl="/brand/:slug/dashboard"
                            afterSelectOrganizationUrl="/brand/:slug/dashboard"
                            hidePersonal
                            appearance={{
                                elements: {
                                    rootBox: "w-full",
                                    organizationSwitcherTrigger: "w-full justify-center bg-stone-800 border-stone-700 text-white hover:bg-stone-700",
                                }
                            }}
                        />
                    </div>

                    <div className="pt-4 border-t border-stone-800">
                        <p className="text-sm text-stone-500">
                            Don't see your organization? Check your email for the invitation link.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // 3. User Sync
    try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        const email = user.emailAddresses[0]?.emailAddress;

        if (email) {
            const tenant = await prisma.tenant.findUnique({
                where: { clerkOrgId: orgId }
            });

            if (tenant) {
                const pendingInvite = await prisma.invitation.findFirst({
                    where: {
                        tenantId: tenant.id,
                        email: email,
                        status: 'PENDING'
                    },
                    orderBy: { createdAt: 'desc' }
                });

                const role = pendingInvite?.inviteRole || "STAFF";
                const outletId = pendingInvite?.outletId || null;

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

                await client.users.updateUserMetadata(userId, {
                    publicMetadata: {
                        role: role,
                        tenantId: tenant.id,
                        outletId: outletId,
                        onboardingComplete: true
                    }
                });

                if (role === 'OUTLET_MANAGER') {
                    redirect('/outlet/dashboard');
                } else if (role === 'STAFF') {
                    redirect('/outlet/orders');
                } else {
                    redirect(`/brand/${orgSlug}/dashboard`);
                }
            }
        }
    } catch (e) {
        console.error("Failed to sync user on acceptance:", e);
    }

    redirect(`/brand/${orgSlug}/dashboard`);
}

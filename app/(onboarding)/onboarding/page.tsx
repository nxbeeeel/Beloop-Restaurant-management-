import { auth, clerkClient } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { prisma } from "@/server/db";
import { redirect } from "next/navigation";

/**
 * ONBOARDING PAGE
 * - Checks DB for existing user role and redirects if found
 * - Syncs role to Clerk metadata to fix future logins
 * - Shows pending state for users without role
 * - Uses premium dark theme
 */
export default async function OnboardingPage() {
    const { userId } = await auth();

    // Not authenticated - redirect to login
    if (!userId) {
        return redirect("/login");
    }

    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const firstName = clerkUser.firstName || "User";
    const email = clerkUser.emailAddresses[0]?.emailAddress;

    // ========================================
    // CHECK DB USER - Maybe they have a role!
    // ========================================
    const dbUser = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true, role: true, tenantId: true, outletId: true }
    });

    if (dbUser?.role) {
        // Sync role to Clerk metadata for future logins
        try {
            await client.users.updateUser(userId, {
                publicMetadata: {
                    role: dbUser.role,
                    tenantId: dbUser.tenantId,
                    outletId: dbUser.outletId
                }
            });
            console.log(`[Onboarding] Synced role ${dbUser.role} to Clerk for user ${userId}`);
        } catch (syncError) {
            console.error("[Onboarding] Failed to sync to Clerk:", syncError);
        }

        // Redirect based on role
        if (dbUser.role === 'SUPER') {
            return redirect('/super/dashboard');
        }

        if (dbUser.role === 'BRAND_ADMIN' && dbUser.tenantId) {
            const tenant = await prisma.tenant.findUnique({
                where: { id: dbUser.tenantId },
                select: { slug: true }
            });
            if (tenant?.slug) {
                return redirect(`/brand/${tenant.slug}/dashboard`);
            }
        }

        if (dbUser.role === 'OUTLET_MANAGER') {
            return redirect('/outlet/dashboard');
        }

        if (dbUser.role === 'STAFF') {
            return redirect('/outlet/orders');
        }
    }

    // ========================================
    // NO ROLE FOUND - Check for pending invitations
    // ========================================
    let pendingInvite = null;
    if (email) {
        pendingInvite = await prisma.invitation.findFirst({
            where: { email, status: 'PENDING' },
            include: { tenant: { select: { name: true } } }
        });
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 flex flex-col items-center pt-20 px-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-600/5 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md bg-stone-900/80 backdrop-blur-xl border border-stone-800 rounded-2xl shadow-2xl p-8 text-center space-y-6">
                <div className="flex justify-center mb-4">
                    <UserButton afterSignOutUrl="/login" />
                </div>

                <h1 className="text-2xl font-bold text-white">Welcome, {firstName}!</h1>

                {pendingInvite ? (
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-left">
                        <h3 className="font-semibold text-rose-400 mb-2">Pending Invitation</h3>
                        <p className="text-sm text-stone-300">
                            You have a pending invitation to join <strong className="text-white">{pendingInvite.tenant?.name}</strong>.
                        </p>
                        <a
                            href={`/invite/user?token=${pendingInvite.token}`}
                            className="mt-4 block w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition-colors text-center"
                        >
                            Accept Invitation
                        </a>
                    </div>
                ) : (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-left">
                        <h3 className="font-semibold text-amber-400 mb-2">Pending Setup</h3>
                        <p className="text-sm text-stone-300">
                            You do not have access to any organizations yet. If you were invited, please check your email for the invitation link.
                        </p>
                    </div>
                )}

                {/* Debug Info - Shows what we know about the user */}
                <details className="text-left bg-stone-800/50 rounded-lg p-3">
                    <summary className="text-xs text-stone-500 cursor-pointer">Debug Info (tap to expand)</summary>
                    <div className="mt-2 text-xs text-stone-400 space-y-1 font-mono">
                        <p>Clerk ID: {userId?.slice(0, 20)}...</p>
                        <p>Email: {email}</p>
                        <p>DB User Found: {dbUser ? 'Yes' : 'No'}</p>
                        <p>DB Role: {dbUser?.role || 'None'}</p>
                        <p>DB TenantId: {dbUser?.tenantId || 'None'}</p>
                    </div>
                </details>

                <div className="pt-4 border-t border-stone-800">
                    <p className="text-xs text-stone-500">
                        Need help? Contact <a href="mailto:support@beloop.app" className="text-rose-400 hover:underline">support@beloop.app</a>
                    </p>
                </div>
            </div>
        </div>
    );
}


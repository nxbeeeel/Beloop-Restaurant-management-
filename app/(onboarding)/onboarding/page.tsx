import { auth, clerkClient } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { prisma } from "@/server/db";

/**
 * ONBOARDING PAGE
 * - NO REDIRECTS (middleware handles all routing)
 * - Only shows pending state for users without role
 * - Uses premium dark theme
 */
export default async function OnboardingPage() {
    const { userId } = await auth();

    // Not authenticated - middleware will handle
    if (!userId) {
        return null;
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const firstName = user.firstName || "User";
    const email = user.emailAddresses[0]?.emailAddress;

    // Check for pending invitations
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

                <div className="pt-4 border-t border-stone-800">
                    <p className="text-xs text-stone-500">
                        Need help? Contact <a href="mailto:support@beloop.app" className="text-rose-400 hover:underline">support@beloop.app</a>
                    </p>
                </div>
            </div>
        </div>
    );
}

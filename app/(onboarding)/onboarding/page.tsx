import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { prisma } from "@/server/db";

export default async function OnboardingPage() {
    const { userId } = await auth();

    if (!userId) {
        return redirect("/login");
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const firstName = user.firstName || "User";
    const metadata = user.publicMetadata as any;

    // AUTO-REDIRECT BASED ON ROLE (No button needed)

    // SUPER ADMIN - Direct redirect
    if (metadata?.role === 'SUPER') {
        return redirect('/super/dashboard');
    }

    // BRAND ADMIN - Fetch tenant slug and redirect
    if (metadata?.role === 'BRAND_ADMIN' && metadata?.tenantId) {
        const tenant = await prisma.tenant.findUnique({
            where: { id: metadata.tenantId },
            select: { slug: true }
        });
        if (tenant?.slug) {
            return redirect(`/brand/${tenant.slug}/dashboard`);
        }
    }

    // OUTLET MANAGER - Direct redirect
    if (metadata?.role === 'OUTLET_MANAGER') {
        return redirect('/outlet/dashboard');
    }

    // STAFF - Direct redirect
    if (metadata?.role === 'STAFF') {
        return redirect('/outlet/orders');
    }

    // NO ROLE YET - Check if there's a pending invitation
    const email = user.emailAddresses[0]?.emailAddress;
    let pendingInvite = null;

    if (email) {
        pendingInvite = await prisma.invitation.findFirst({
            where: { email, status: 'PENDING' },
            include: { tenant: { select: { name: true } } }
        });
    }

    // Show pending state
    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 flex flex-col items-center pt-20 px-4">
            <div className="w-full max-w-md bg-stone-900/80 backdrop-blur-xl border border-stone-800 rounded-2xl shadow-2xl p-8 text-center space-y-6">
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

                <p className="text-xs text-stone-500">
                    Need help? Contact <a href="mailto:support@beloop.app" className="text-rose-400 hover:underline">support@beloop.app</a>
                </p>
            </div>
        </div>
    );
}

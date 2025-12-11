import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { prisma } from "@/server/db";

export default async function OnboardingPage() {
    const { userId } = await auth();

    if (!userId) {
        return redirect("/login");
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const firstName = user.firstName || "User";

    // CHECK METADATA FIRST - Auto Redirect or Show Button
    const metadata = user.publicMetadata as any;
    let targetUrl = null;

    if (metadata?.onboardingComplete && metadata?.role && metadata?.tenantId) {
        // Fetch tenant slug for safe redirect
        const tenant = await prisma.tenant.findUnique({
            where: { id: metadata.tenantId },
            select: { slug: true }
        });

        if (tenant?.slug) {
            console.log("User already onboarded. Providing link to dashboard.");
            if (metadata.role === 'BRAND_ADMIN' || metadata.role === 'SUPER') {
                targetUrl = `/brand/${tenant.slug}/dashboard`;
            } else if (metadata.outletId) { // Staff/Manager
                targetUrl = `/outlet/dashboard`;
            }
        }
    }

    if (targetUrl) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-20 px-4">
                <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 text-center space-y-6">
                    <div className="flex justify-center mb-4">
                        <UserButton afterSignOutUrl="/login" />
                    </div>

                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900">Welcome back, {firstName}!</h1>
                    <p className="text-gray-600">
                        Your account is set up and ready to go.
                    </p>

                    <a href={targetUrl} className="block w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition-colors shadow-md">
                        Launch Dashboard
                    </a>

                    <p className="text-xs text-gray-400 mt-4">
                        If you are stuck in a loop, please strict refresh (Ctrl+F5) or sign out and sign back in.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-20 px-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 text-center space-y-6">
                <div className="flex justify-center mb-4">
                    <UserButton afterSignOutUrl="/login" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900">Welcome, {firstName}!</h1>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                    <h3 className="font-semibold text-yellow-800 mb-2">Pending Setup</h3>
                    <p className="text-sm text-yellow-700">
                        You do not have access to any Brand Organizations yet.
                    </p>
                </div>

                <div className="space-y-4">
                    <p className="text-gray-600">
                        If you were invited to join a team, please check your email for the invitation link, or accept the invitation below if available.
                    </p>

                    <div className="flex justify-center py-4 border-t border-b border-gray-100">
                        <OrganizationSwitcher
                            afterCreateOrganizationUrl="/brand/:slug/dashboard"
                            afterSelectOrganizationUrl="/brand/:slug/dashboard"
                            hidePersonal
                            appearance={{
                                elements: {
                                    rootBox: "w-full flex justify-center",
                                    organizationSwitcherTrigger: "w-full justify-center px-4 py-2 border rounded-md hover:bg-gray-50"
                                }
                            }}
                        />
                    </div>

                    <p className="text-xs text-gray-400">
                        Need help? Contact your administrator at <a href="mailto:support@beloop.app" className="text-blue-500 hover:underline">support@beloop.app</a>
                    </p>
                </div>
            </div>
        </div>
    );
}

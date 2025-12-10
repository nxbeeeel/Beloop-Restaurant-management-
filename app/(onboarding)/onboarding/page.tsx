import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";

export default async function OnboardingPage() {
    const { userId, orgId } = await auth();

    if (!userId) {
        return redirect("/login");
    }

    // If they have an Org, why are they here? Middleware should have sent them to dashboard.
    // Unless they have an Org but Middleware sent them here because they tried to access a *different* org's route?
    // Or they manually navigated here.
    if (orgId) {
        // Offer to go to dashboard
        // We can fetch the slug if needed, but we don't have it easily without DB call or claims.
        // Let's assume Middleware works and if they are here, they might want to switch orgs or check status.
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const firstName = user.firstName || "User";

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

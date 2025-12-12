import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/server/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { PageTransition } from "@/components/ui/animations";
import type { Metadata } from "next";
import { Sidebar } from "@/components/brand/Sidebar";

export const metadata: Metadata = {
    title: "Beloop",
    description: "Brand Dashboard",
};

export default async function BrandLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userId, orgId, orgSlug } = await auth();

    // Not authenticated - redirect to login
    if (!userId) {
        return redirect("/login");
    }

    let tenant = null;

    if (orgId) {
        // Fetch Tenant by Clerk Org ID
        tenant = await prisma.tenant.findUnique({
            where: { clerkOrgId: orgId },
            include: {
                users: { where: { clerkId: userId }, take: 1 } // Optional: Link verification
            }
        });
    }

    // Fallback: Legacy / Metadata check
    if (!tenant) {
        // Get user with tenant info (legacy single-tenant mode)
        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
            include: { tenant: true }
        });
        tenant = user?.tenant || null;
    }

    // No tenant found - redirect to onboarding
    if (!tenant) {
        console.log("[BrandLayout] No tenant found for user, redirecting to onboarding");
        return redirect("/onboarding");
    }

    const brandName = tenant.name || "Beloop";
    const brandLogo = tenant.logoUrl;
    const brandColor = tenant.primaryColor || "#e11d48";

    // Determine slug for navigation
    const activeSlug = orgSlug || tenant.slug;


    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar
                brandName={brandName}
                brandLogo={brandLogo}
                brandColor={brandColor}
                userName={"Brand Admin"} // We can fetch name if needed, but for speed just static or from clerk
                slug={activeSlug}
            />
            <main className="flex-1 p-8">
                <PageTransition>
                    {/* {user?.tenant?.isPaymentDue && (
                        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r shadow-sm">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-700">
                                        <span className="font-bold">Payment Due:</span> Please clear your outstanding dues to avoid service interruption. Contact support for assistance.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )} */}
                    {children}
                </PageTransition>
            </main>
        </div>
    );
}

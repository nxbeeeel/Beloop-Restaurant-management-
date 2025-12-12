import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";

/**
 * Brand Dashboard Resolver
 * Redirects BRAND_ADMIN to their correct /brand/[slug]/dashboard
 * With fallback to DB lookup if Clerk metadata is missing
 */
export default async function BrandDashboardResolver() {
    const { userId } = await auth();

    if (!userId) {
        return redirect("/login");
    }

    let tenantId: string | null = null;

    // Try 1: Get from Clerk metadata
    try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        const metadata = user.publicMetadata as any;
        tenantId = metadata?.tenantId || null;
    } catch (error) {
        console.error("[BrandResolver] Failed to get Clerk metadata:", error);
    }

    // Try 2: Fallback to DB user lookup
    if (!tenantId) {
        const dbUser = await prisma.user.findUnique({
            where: { clerkId: userId },
            select: { tenantId: true, role: true }
        });

        if (dbUser?.tenantId && dbUser.role === 'BRAND_ADMIN') {
            tenantId = dbUser.tenantId;

            // Sync to Clerk metadata for future requests
            try {
                const client = await clerkClient();
                await client.users.updateUser(userId, {
                    publicMetadata: {
                        role: 'BRAND_ADMIN',
                        tenantId: dbUser.tenantId
                    }
                });
                console.log("[BrandResolver] Synced user metadata to Clerk");
            } catch (syncError) {
                console.error("[BrandResolver] Failed to sync to Clerk:", syncError);
            }
        }
    }

    // Get tenant slug
    if (tenantId) {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { slug: true }
        });

        if (tenant?.slug) {
            return redirect(`/brand/${tenant.slug}/dashboard`);
        }
    }

    // Fallback to onboarding if no tenant found
    return redirect("/onboarding");
}


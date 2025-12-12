import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";

/**
 * Brand Dashboard Resolver
 * Redirects BRAND_ADMIN to their correct /brand/[slug]/dashboard
 */
export default async function BrandDashboardResolver() {
    const { userId } = await auth();

    if (!userId) {
        return redirect("/login");
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const metadata = user.publicMetadata as any;

    // Get tenant slug from metadata
    if (metadata?.tenantId) {
        const tenant = await prisma.tenant.findUnique({
            where: { id: metadata.tenantId },
            select: { slug: true }
        });

        if (tenant?.slug) {
            return redirect(`/brand/${tenant.slug}/dashboard`);
        }
    }

    // Fallback to onboarding if no tenant found
    return redirect("/onboarding");
}

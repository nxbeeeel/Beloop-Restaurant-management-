import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { currentUser } from "@clerk/nextjs/server";

export default async function OnboardingLayout({
    children
}: {
    children: React.ReactNode
}) {
    // HARD LOOP BREAKER - Server Side DB Check
    // If the DB says "COMPLETED", we absolutely forbid the onboarding page.
    const user = await currentUser();

    if (user) {
        try {
            const dbUser = await prisma.user.findUnique({
                where: { clerkId: user.id },
                include: { tenant: true }
            });

            if (dbUser?.tenant?.onboardingStatus === 'COMPLETED') {
                // Determine redirect target based on role
                const role = dbUser.role;
                const slug = dbUser.tenant.slug;

                if (role === 'BRAND_ADMIN') {
                    redirect(`/brand/${slug || 'dashboard'}/dashboard`);
                } else if (role === 'OUTLET_MANAGER') {
                    redirect('/outlet/dashboard');
                } else if (role === 'STAFF') {
                    redirect('/outlet/orders');
                }
            }
        } catch (e) {
            // If redirect happens in try block, next catches it. 
            // If DB fail, we fall through to children.
        }
    }

    return (
        <div className="onboarding-layout">
            {children}
        </div>
    );
}

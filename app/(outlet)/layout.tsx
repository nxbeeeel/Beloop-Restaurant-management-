import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { Sidebar } from "@/components/outlet/Sidebar";

export default async function OutletLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userId } = await auth();
    // Middleware handles protection.
    if (!userId) return null; // Safe exit vs Redirect loop

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        include: { outlet: true },
    });

    const allowedRoles = ["OUTLET_MANAGER", "STAFF", "BRAND_ADMIN", "SUPER"];
    if (!user || !user.role || !allowedRoles.includes(user.role)) {
        redirect("/");
    }

    const isManager = user.role === "OUTLET_MANAGER";

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            <Sidebar user={user} outlet={user.outlet} />
            <main className="flex-1 ml-64 h-screen overflow-y-auto">
                <div className="p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}

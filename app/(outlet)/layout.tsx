import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { Sidebar } from "@/components/outlet/Sidebar";

export default async function OutletLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userId } = auth();
    if (!userId) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        include: { outlet: true },
    });

    if (!user || (user.role !== "OUTLET_MANAGER" && user.role !== "STAFF")) {
        redirect("/");
    }

    const isManager = user.role === "OUTLET_MANAGER";

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            <Sidebar
                outletName={user.outlet?.name}
                isManager={isManager}
                userName={user.name || undefined}
            />
            <main className="flex-1 h-screen overflow-y-auto">
                <div className="p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}

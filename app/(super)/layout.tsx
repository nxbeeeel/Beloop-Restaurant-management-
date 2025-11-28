import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

import { MobileSidebar } from "@/components/admin/MobileSidebar";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default async function SuperLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userId } = auth();
    if (!userId) redirect("/login");

    // TEMPORARY: Comment out role check for debugging
    // const user = await prisma.user.findUnique({
    //     where: { clerkId: userId },
    // });
    // if (!user || user.role !== "SUPER") {
    //     redirect("/");
    // }

    return (
        <div className="flex min-h-screen bg-gray-100 flex-col md:flex-row">
            {/* Mobile Sidebar */}
            <div className="md:hidden p-4 bg-white border-b flex justify-between items-center sticky top-0 z-40 shadow-sm">
                <h2 className="text-lg font-bold">🔧 Platform Admin</h2>
                <MobileSidebar />
            </div>

            {/* Desktop Sidebar */}
            <aside className="hidden md:block w-64 bg-gray-900 text-white p-6 min-h-screen sticky top-0 h-screen overflow-y-auto">
                <h2 className="text-xl font-bold mb-8">🔧 Platform Admin</h2>
                <nav className="flex flex-col space-y-4 text-sm font-medium">
                    <Link
                        href="/super/dashboard"
                        className="transition-colors hover:text-blue-400 text-white"
                    >
                        Dashboard
                    </Link>
                    <Link
                        href="/super/tenants"
                        className="transition-colors hover:text-blue-400 text-gray-300"
                    >
                        Tenants
                    </Link>
                    <Link
                        href="/super/users"
                        className="transition-colors hover:text-blue-400 text-gray-300"
                    >
                        Users
                    </Link>
                    <Link
                        href="/super/payments"
                        className="transition-colors hover:text-blue-400 text-gray-300"
                    >
                        Payments
                    </Link>
                    <Link
                        href="/super/support"
                        className="transition-colors hover:text-blue-400 text-gray-300"
                    >
                        Support
                    </Link>
                    <Link
                        href="/super/health"
                        className="transition-colors hover:text-blue-400 text-gray-300"
                    >
                        System Health
                    </Link>
                </nav>

                {/* Logout Button */}
                <div className="absolute bottom-0 left-0 w-full p-6 border-t border-gray-800">
                    <LogoutButton variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800" />
                </div>
            </aside>
            <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
                {children}
            </main>
        </div>
    );
}

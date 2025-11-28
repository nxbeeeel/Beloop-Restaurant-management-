import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import LogoutButton from "@/components/LogoutButton";
import Image from "next/image";

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
        <div className="flex min-h-screen bg-gray-50">
            <aside className="w-64 bg-white border-r p-6 flex flex-col">
                <div className="mb-8 flex items-center gap-4">
                    <div className="w-14 h-14 relative rounded-xl overflow-hidden bg-rose-50 border border-rose-100 shadow-sm">
                        <Image src="/logo.png" alt="Beloop" fill className="object-contain p-1.5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold leading-tight">{user.outlet?.name}</h2>
                        <p className="text-xs text-gray-500 font-medium">{isManager ? "Outlet Manager" : "Staff"}</p>
                    </div>
                </div>
                <nav className="space-y-4 flex-1">
                    {/* Daily Operations */}
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-4">Daily Operations</p>
                        <a href="/outlet/sales/entry" className="block px-4 py-2 rounded hover:bg-gray-100 font-medium text-green-600 bg-green-50">📝 Sales & Closing</a>
                        <a href="/outlet/expenses" className="block px-4 py-2 rounded hover:bg-gray-100">💰 Expenses</a>
                    </div>

                    {/* Inventory & Orders - Manager Only */}
                    {isManager && (
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-4">Inventory</p>
                            <a href="/outlet/inventory" className="block px-4 py-2 rounded hover:bg-gray-100">📦 Stock Levels</a>
                            <a href="/outlet/inventory/products" className="block px-4 py-2 rounded hover:bg-gray-100">📋 Products</a>
                            <a href="/outlet/orders" className="block px-4 py-2 rounded hover:bg-gray-100">🛒 Purchase Orders</a>
                            <a href="/outlet/suppliers" className="block px-4 py-2 rounded hover:bg-gray-100">🏪 Suppliers</a>
                        </div>
                    )}

                    {/* Reports */}
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-4">View Data</p>
                        <a href="/outlet/entries" className="block px-4 py-2 rounded hover:bg-gray-100">📋 Entries</a>
                        <a href="/outlet/sales" className="block px-4 py-2 rounded hover:bg-gray-100">📊 Sales History</a>
                        <a href="/outlet/dashboard" className="block px-4 py-2 rounded hover:bg-gray-100">📈 Dashboard</a>
                    </div>

                    {/* Settings - Manager Only */}
                    {isManager && (
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-4">Settings</p>
                            <a href="/outlet/settings/sheets" className="block px-4 py-2 rounded hover:bg-gray-100">📋 Google Sheets</a>
                        </div>
                    )}

                    {/* Support */}
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-4">Help</p>
                        <a href="/support" className="block px-4 py-2 rounded hover:bg-gray-100 text-blue-600">❓ Help & Support</a>
                    </div>
                </nav>
                <div className="pt-4 border-t">
                    <div className="flex items-center justify-between px-4 py-2">
                        <span className="text-sm text-gray-600">{user?.name}</span>
                        <LogoutButton />
                    </div>
                </div>
            </aside>
            <main className="flex-1 p-8">
                {children}
            </main>
        </div>
    );
}

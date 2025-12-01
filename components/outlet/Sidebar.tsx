"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    ShoppingBag,
    ClipboardList,
    Users,
    Settings,
    LogOut,
    Store,
    Package,
    FileText,
    UtensilsCrossed,
    Truck,
    BarChart3,
    HelpCircle,
    Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClerk } from "@clerk/nextjs";
import Image from "next/image";

interface SidebarProps {
    outletName?: string;
    isManager: boolean;
    userName?: string;
}

export function Sidebar({ outletName, isManager, userName }: SidebarProps) {
    const pathname = usePathname();
    const { signOut } = useClerk();

    const isActive = (path: string) => pathname === path || pathname?.startsWith(path + "/");

    const NavItem = ({ href, icon: Icon, label, exact = false }: { href: string; icon: any; label: string; exact?: boolean }) => {
        const active = exact ? pathname === href : isActive(href);
        return (
            <Link href={href} className="block mb-1">
                <div
                    className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        active
                            ? "bg-violet-50 text-violet-700 shadow-sm"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                >
                    <Icon size={18} className={cn(active ? "text-violet-600" : "text-gray-400 group-hover:text-gray-600")} />
                    {label}
                </div>
            </Link>
        );
    };

    return (
        <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0">
            {/* Header */}
            <div className="p-6 border-b border-gray-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 relative rounded-xl overflow-hidden bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200">
                        <Store className="text-white w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-gray-900 leading-tight truncate w-32">{outletName || "Outlet"}</h2>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                            {isManager ? "Manager" : "Staff"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-100">

                {/* Main */}
                <div>
                    <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Overview</p>
                    <NavItem href="/outlet/dashboard" icon={LayoutDashboard} label="Dashboard" exact />
                    <NavItem href="/outlet/sales/entry" icon={ClipboardList} label="Daily Entry" />
                </div>

                {/* Management */}
                {isManager && (
                    <div>
                        <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Management</p>
                        <NavItem href="/outlet/menu" icon={UtensilsCrossed} label="Menu & Products" />
                        <NavItem href="/outlet/inventory" icon={Package} label="Stock Inventory" />
                        <NavItem href="/outlet/orders" icon={Truck} label="Purchase Orders" />
                        <NavItem href="/outlet/suppliers" icon={Store} label="Suppliers" />
                        <NavItem href="/outlet/customers" icon={Users} label="Customers" />
                    </div>
                )}

                {/* Analytics */}
                <div>
                    <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Analytics</p>
                    <NavItem href="/outlet/sales" icon={BarChart3} label="Sales History" />
                    <NavItem href="/outlet/reports" icon={FileText} label="Reports" />
                    <NavItem href="/outlet/expenses" icon={ShoppingBag} label="Expenses" />
                </div>

                {/* Settings */}
                {isManager && (
                    <div>
                        <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">System</p>
                        <NavItem href="/outlet/settings/sheets" icon={FileText} label="Google Sheets" />
                        {/* <NavItem href="/outlet/settings" icon={Settings} label="Settings" /> */}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-50 bg-gray-50/50">
                <div className="flex items-center gap-3 mb-3 px-2">
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-xs">
                        {userName?.charAt(0) || "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
                        <p className="text-xs text-gray-500 truncate">Logged in</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    className="w-full justify-start text-gray-600 hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition-colors"
                    onClick={() => signOut()}
                >
                    <LogOut size={16} className="mr-2" />
                    Sign Out
                </Button>
            </div>
        </aside>
    );
}

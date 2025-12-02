"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    ShoppingBag,
    Package,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    Users,
    FileText,
    Store,
    Truck,
    Receipt,
    UserCircle,
    ShoppingCart,
    IndianRupee,
    ClipboardCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useClerk } from "@clerk/nextjs";

interface SidebarProps {
    user: any;
    outlet: any;
}

export function Sidebar({ user, outlet }: SidebarProps) {
    const pathname = usePathname();
    const { signOut } = useClerk();

    const isActive = (path: string) => pathname === path;

    const menuItems = [
        {
            title: "Overview",
            items: [
                { name: "Dashboard", href: "/outlet/dashboard", icon: LayoutDashboard },
            ]
        },
        {
            title: "Management",
            items: [
                { name: "Menu", href: "/outlet/menu", icon: Menu },
                { name: "Inventory", href: "/outlet/inventory", icon: Package },
                { name: "Suppliers", href: "/outlet/suppliers", icon: Truck },
                { name: "Customers", href: "/outlet/customers", icon: Users },
            ]
        },
        {
            title: "Operations",
            items: [
                { name: "Sales Entry", href: "/outlet/sales/entry", icon: ShoppingBag },
                { name: "Expenses", href: "/outlet/entries", icon: Receipt },
                { name: "Purchase Orders", href: "/outlet/purchase-orders", icon: Truck },
                { name: "Supplier Payments", href: "/outlet/payments", icon: IndianRupee },
                { name: "Stock Verification", href: "/outlet/stock-verification", icon: ClipboardCheck },
            ]
        },
        {
            title: "Analytics",
            items: [
                { name: "Reports", href: "/outlet/reports", icon: BarChart3 },
            ]
        },
    ];

    // Add Manager/System items if role allows
    if (user?.role === "OUTLET_MANAGER" || user?.role === "BRAND_ADMIN" || user?.role === "SUPER") {
        menuItems.push({
            title: "System",
            items: [
                { name: "Settings", href: "/outlet/settings", icon: Settings },
            ]
        });
    }

    return (
        <aside className="w-64 bg-white border-r border-gray-100 flex flex-col fixed h-full z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
            {/* Branding */}
            <div className="p-6 border-b border-gray-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Store className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                            Beloop<span className="text-primary">.</span>
                        </h1>
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Restaurant Management</p>
                    </div>
                </div>
                {outlet && (
                    <div className="mt-4 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-xs font-medium text-gray-500 truncate">{outlet.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{outlet.address || 'No address set'}</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
                {menuItems.map((section) => (
                    <div key={section.title}>
                        <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            {section.title}
                        </h3>
                        <div className="space-y-1">
                            {section.items.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                        isActive(item.href)
                                            ? "bg-primary/10 text-primary shadow-sm"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    )}
                                >
                                    <item.icon className={cn("w-4 h-4", isActive(item.href) ? "text-primary" : "text-gray-400")} />
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* User Profile */}
            <div className="p-4 border-t border-gray-50 bg-gray-50/50">
                <div className="flex items-center gap-3 mb-3 px-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {user?.name?.[0] || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mt-0.5">
                            {user?.role?.replace('_', ' ')}
                        </p>
                    </div>
                </div>
                <Link href="/outlet/profile">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100 h-9 mb-1"
                    >
                        <UserCircle className="w-4 h-4 mr-2" />
                        Profile & Settings
                    </Button>
                </Link>
                <Button
                    variant="ghost"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 h-9"
                    onClick={() => signOut()}
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                </Button>
            </div>
        </aside>
    );
}

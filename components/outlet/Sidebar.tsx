"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Package,
    Settings,
    LogOut,
    Menu,
    Users,
    Store,
    Truck,
    Receipt,
    UserCircle,
    ShoppingCart,
    IndianRupee,
    ClipboardCheck,
    FileText,
    Wallet,
    Upload,
    CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useClerk } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
    user: any;
    outlet: any;
}

interface NavItem {
    name: string;
    href: string;
    icon: any;
    external?: boolean;
    staffAccess?: boolean; // true = staff can access, false = manager only
}

interface NavSection {
    title: string;
    items: NavItem[];
    staffAccess?: boolean; // If false, entire section hidden from staff
}

export function Sidebar({ user, outlet }: SidebarProps) {
    const pathname = usePathname();
    const { signOut } = useClerk();
    const utils = trpc.useUtils();

    const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');
    const isStaff = user?.role === "STAFF";
    const isManager = user?.role === "OUTLET_MANAGER" || user?.role === "BRAND_ADMIN" || user?.role === "SUPER";

    // ⚡ ZERO-LAG: Aggressive prefetching on hover
    // Prefetches data for ALL routes so pages load instantly
    const handlePrefetch = (href: string) => {
        if (!outlet?.id) return;
        const outletId = outlet.id;
        const tenantId = user?.tenantId;

        switch (href) {
            case '/outlet/dashboard':
                void utils.dashboard.getOutletStats.prefetch({ outletId });
                break;
            case '/outlet/inventory':
                void utils.inventory.list.prefetch({ outletId });
                void utils.inventory.getLowStock.prefetch({ outletId });
                break;
            case '/outlet/suppliers':
                void utils.suppliers.list.prefetch();
                break;
            case '/outlet/customers':
                void utils.customers.getAll.prefetch({});
                void utils.customers.getStats.prefetch();
                break;
            case '/outlet/purchase-orders':
                void utils.procurement.listOrders.prefetch({ outletId });
                break;
            case '/outlet/supplier-payments':
                void utils.suppliers.list.prefetch();
                break;
            case '/outlet/accounts':
                // Prefetch daily closures for current month
                void utils.dailyClosure.list.prefetch({ outletId });
                void utils.expenses.list.prefetch({ outletId, startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1), endDate: new Date() });
                break;
            case '/outlet/menu':
                void utils.products.getAll.prefetch({ outletId });
                break;
            case '/outlet/stock-verification':
                void utils.inventory.getLowStock.prefetch({ outletId });
                break;
            // Sales entry uses previous day's data
            case '/outlet/sales/entry':
                void utils.sales.getDaily.prefetch({ outletId, date: new Date() });
                break;
        }
    };

    // ERP-style navigation structure
    const menuItems: NavSection[] = [
        {
            title: "Daily Operations",
            items: [
                { name: "Sales Entry", href: "/outlet/sales/entry", icon: FileText, staffAccess: true },
                { name: "Stock Verification", href: "/outlet/stock-verification", icon: ClipboardCheck, staffAccess: true },
                { name: "Daily Closing", href: "/outlet/close-daily", icon: Receipt, staffAccess: true },
            ]
        },
        {
            title: "Procurement",
            items: [
                { name: "Purchase Orders", href: "/outlet/purchase-orders", icon: ShoppingCart, staffAccess: true }, // Staff can receive
                { name: "Supplier Payments", href: "/outlet/supplier-payments", icon: CreditCard, staffAccess: false },
                { name: "Suppliers", href: "/outlet/suppliers", icon: Truck, staffAccess: false },
            ],
            staffAccess: true // Section visible but some items hidden
        },
        {
            title: "Inventory",
            items: [
                { name: "Stock Levels", href: "/outlet/inventory", icon: Package, staffAccess: false },
                { name: "Menu Items", href: "/outlet/menu", icon: Menu, staffAccess: false },
            ],
            staffAccess: false
        },
        {
            title: "Accounts",
            items: [
                { name: "Cash Flow", href: "/outlet/accounts", icon: Wallet, staffAccess: false },
                { name: "Expenses", href: "/outlet/expenses", icon: IndianRupee, staffAccess: false },
                { name: "Payouts", href: "/outlet/payouts", icon: Upload, staffAccess: false },
            ],
            staffAccess: false
        },
        {
            title: "Insights",
            items: [
                { name: "Dashboard", href: "/outlet/dashboard", icon: LayoutDashboard, staffAccess: false },
                { name: "Customers", href: "/outlet/customers", icon: Users, staffAccess: false },
            ],
            staffAccess: false
        },
    ];

    // Add Settings for managers only
    if (isManager) {
        menuItems.push({
            title: "Settings",
            items: [
                { name: "Outlet Settings", href: "/outlet/settings", icon: Settings, staffAccess: false },
            ],
            staffAccess: false
        });
    }

    // Filter menu items based on role
    const filteredMenuItems = menuItems
        .filter(section => {
            // If manager, show all sections
            if (isManager) return true;
            // If staff, only show sections with staffAccess or mixed access
            return section.staffAccess !== false;
        })
        .map(section => ({
            ...section,
            items: section.items.filter(item => {
                // If manager, show all items
                if (isManager) return true;
                // If staff, only show items with staffAccess: true
                return item.staffAccess === true;
            })
        }))
        .filter(section => section.items.length > 0); // Remove empty sections

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
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                            {isStaff ? 'Staff Portal' : 'Outlet Manager'}
                        </p>
                    </div>
                </div>
                {outlet && (
                    <div className="mt-4 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-xs font-medium text-gray-500 truncate">{outlet.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{outlet.address || 'No address set'}</p>
                    </div>
                )}
            </div>

            {/* Navigation with Role-Based Filtering */}
            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
                {filteredMenuItems.map((section) => (
                    <div key={section.title}>
                        <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            {section.title}
                        </h3>
                        <div className="space-y-1">
                            {section.items.map((item) => (
                                item.external ? (
                                    <a
                                        key={item.href}
                                        href={item.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-primary hover:bg-primary/10"
                                    >
                                        <item.icon className="w-4 h-4 text-primary" />
                                        {item.name}
                                    </a>
                                ) : (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onMouseEnter={() => handlePrefetch(item.href)}
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
                                )
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
                        <Badge variant="secondary" className={cn(
                            "text-[10px] px-1.5 py-0",
                            isStaff ? "bg-blue-100 text-blue-700" : "bg-primary/10 text-primary"
                        )}>
                            {isStaff ? 'Staff' : 'Manager'}
                        </Badge>
                    </div>
                </div>
                <Link href="/outlet/profile">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100 h-9 mb-1"
                    >
                        <UserCircle className="w-4 h-4 mr-2" />
                        Profile
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

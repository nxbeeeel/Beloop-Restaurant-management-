"use client";

import { useState } from "react";
import { Menu, X, LogOut, LayoutDashboard, FileText, ShoppingCart, DollarSign, Package, Users, ClipboardList, Truck, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useClerk } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function OutletLayoutClient({
    children,
    outletName,
    userName
}: {
    children: React.ReactNode;
    outletName: string;
    userName: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const { signOut } = useClerk();

    const pathname = usePathname();

    const toggleMenu = () => setIsOpen(!isOpen);
    const closeMenu = () => setIsOpen(false);

    const isActive = (path: string) => pathname === path;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const NavItem = ({ href, icon: Icon, label, colorClass = "text-gray-600" }: any) => (
        <Link
            href={href}
            onClick={closeMenu}
            className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                isActive(href)
                    ? "bg-gray-900 text-white shadow-lg shadow-gray-900/20"
                    : "hover:bg-gray-100 text-gray-600"
            )}
        >
            <Icon className={cn("h-5 w-5", isActive(href) ? "text-white" : colorClass)} />
            <span className="font-medium">{label}</span>
        </Link>
    );

    const SectionLabel = ({ label }: { label: string }) => (
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-4 mt-6">
            {label}
        </p>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
            {/* Mobile Header */}
            <div className="md:hidden bg-white border-b p-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold">
                        B
                    </div>
                    <span className="font-bold text-gray-900 truncate max-w-[150px]">{outletName}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={toggleMenu}>
                    {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
            </div>

            {/* Sidebar / Mobile Menu */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-40 w-72 bg-white border-r transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen md:sticky md:top-0 overflow-y-auto",
                isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
            )}>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8 px-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-orange-500/20">
                            B
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900 leading-tight">{outletName}</h2>
                            <p className="text-xs text-gray-500 font-medium">Outlet Manager</p>
                        </div>
                    </div>

                    <nav className="space-y-1">
                        <SectionLabel label="Daily Operations" />
                        <NavItem href="/outlet/sales/entry" icon={FileText} label="Sales Entry" colorClass="text-green-600" />
                        <NavItem href="/outlet/expenses" icon={DollarSign} label="Expenses" colorClass="text-rose-600" />
                        <NavItem href="/outlet/close-daily" icon={ClipboardList} label="Daily Closing" colorClass="text-blue-600" />

                        <SectionLabel label="Inventory" />
                        <NavItem href="/outlet/inventory" icon={Package} label="Stock Levels" />
                        <NavItem href="/outlet/orders" icon={ShoppingCart} label="Purchase Orders" />
                        <NavItem href="/outlet/suppliers" icon={Truck} label="Suppliers" />
                        <NavItem href="/outlet/inventory/wastage" icon={LogOut} label="Wastage" colorClass="text-red-500" />

                        <SectionLabel label="Insights" />
                        <NavItem href="/outlet/dashboard" icon={LayoutDashboard} label="Dashboard" />
                        <NavItem href="/outlet/sales" icon={FileText} label="Sales History" />

                        <SectionLabel label="Team & Settings" />

                        <NavItem href="/outlet/settings/sheets" icon={Settings} label="Sheet Settings" />
                    </nav>

                    <div className="mt-8 pt-6 border-t px-2">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs">
                                    {userName.charAt(0)}
                                </div>
                                <span className="text-sm font-medium text-gray-700 truncate max-w-[100px]">
                                    {userName}
                                </span>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                            onClick={() => signOut()}
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
                    onClick={closeMenu}
                />
            )}

            {/* Main Content */}
            <main className="flex-1 w-full md:w-auto">
                <div className="p-4 md:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}

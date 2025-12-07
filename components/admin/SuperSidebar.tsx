'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Building2,
    Users,
    CreditCard,
    Activity,
    LifeBuoy,
    Settings,
    ChevronLeft,
    Menu,
    LogOut,
    FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogoutButton } from '@/components/auth/LogoutButton';
import Image from 'next/image';

const sidebarItems = [
    { icon: LayoutDashboard, label: 'Overview', href: '/super/dashboard' },
    { icon: Building2, label: 'Tenants', href: '/super/tenants' },
    { icon: Users, label: 'Users', href: '/super/users' },
    { icon: FileText, label: 'Applications', href: '/super/applications' },
    { icon: CreditCard, label: 'Payments', href: '/super/payments' },
    { icon: Activity, label: 'System Health', href: '/super/health' },
    { icon: LifeBuoy, label: 'Support', href: '/super/support' },
];

export function SuperSidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <aside
            className={cn(
                "relative flex flex-col h-screen bg-stone-950 text-white transition-all duration-300 border-r border-stone-800 z-50",
                isCollapsed ? "w-20" : "w-72"
            )}
        >
            {/* Header / Logo */}
            <div className="h-20 flex items-center px-6 border-b border-stone-800">
                {!isCollapsed ? (
                    <div className="flex items-center gap-3">
                        {/* Placeholder Logo if image fails, simple styling */}
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-900/20">
                            <LayoutDashboard className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg tracking-tight text-white">Beloop</h1>
                            <p className="text-xs text-stone-400 font-medium">Super Admin</p>
                        </div>
                    </div>
                ) : (
                    <div className="w-full flex justify-center">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-900/20">
                            <LayoutDashboard className="w-6 h-6 text-white" />
                        </div>
                    </div>
                )}
            </div>

            {/* Toggle Button */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute -right-3 top-24 h-6 w-6 rounded-full bg-rose-600 text-white border-2 border-stone-950 hover:bg-rose-700 md:flex hidden"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <ChevronLeft className={cn("h-3 w-3 transition-transform", isCollapsed && "rotate-180")} />
            </Button>

            {/* Navigation */}
            <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto">
                {sidebarItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
                                isActive
                                    ? "bg-rose-500/10 text-rose-500 font-medium"
                                    : "text-stone-400 hover:text-white hover:bg-stone-900"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5 flex-shrink-0 transition-colors", isActive ? "text-rose-500" : "text-stone-500 group-hover:text-white")} />

                            {!isCollapsed && (
                                <span>{item.label}</span>
                            )}

                            {/* Active Indicator Strip */}
                            {isActive && !isCollapsed && (
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-rose-500 rounded-l-full" />
                            )}

                            {/* Tooltip for Collapsed State */}
                            {isCollapsed && (
                                <div className="absolute left-full ml-4 px-2 py-1 bg-stone-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-stone-700">
                                    {item.label}
                                </div>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer / User Profile */}
            <div className="p-4 border-t border-stone-800 bg-stone-950/50">
                <div className={cn("flex flex-col gap-3", isCollapsed ? "items-center" : "items-stretch")}>

                    {!isCollapsed && (
                        <div className="flex items-center gap-3 mb-2 px-2">
                            <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-stone-400">
                                SA
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium text-white truncate">Super Admin</p>
                                <p className="text-xs text-stone-500 truncate">mnabeelca123...</p>
                            </div>
                        </div>
                    )}

                    <div className={cn("pt-2", isCollapsed && "pt-0")}>
                        {isCollapsed ? (
                            <LogoutButton variant="ghost" size="icon" className="text-stone-400 hover:text-rose-500 hover:bg-stone-900" showText={false} />
                        ) : (
                            <LogoutButton variant="outline" className="w-full justify-start text-stone-400 hover:text-rose-500 hover:bg-stone-900 border-stone-800 hover:border-rose-500/50" />
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
}

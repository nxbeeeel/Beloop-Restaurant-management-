"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    Store,
    Users,
    FileBarChart,
    HelpCircle,
    ChevronLeft,
    ChevronRight,
    Utensils,
    Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserButton } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc";

interface SidebarProps {
    brandName: string;
    brandLogo?: string | null;
    brandColor: string;
    userName?: string | null;
    slug: string;
}

export function Sidebar({ brandName, brandLogo, brandColor, userName, slug }: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();
    const utils = trpc.useUtils();

    const brandStyle = { color: brandColor };

    const toggleSidebar = () => setIsCollapsed(!isCollapsed);

    // Prefetch data on hover for instant navigation
    const handlePrefetch = (href: string) => {
        // Only prefetch dashboard analytics - most impactful for perceived performance
        if (href.includes('/dashboard')) {
            void utils.brandAnalytics.getBrandOverview.prefetch();
        }
    };

    const navItems = [
        { href: `/brand/${slug}/dashboard`, label: "Overview", icon: LayoutDashboard },
        { href: `/brand/${slug}/outlets`, label: "Outlets", icon: Store },
        { href: `/brand/${slug}/users`, label: "Team", icon: Users },
        { href: `/brand/${slug}/products`, label: "Menu", icon: Utensils },
        { href: `/brand/${slug}/reports`, label: "Reports", icon: FileBarChart },
        { href: `/brand/${slug}/settings`, label: "Settings", icon: Settings },
    ];


    return (
        <motion.aside
            initial={{ width: 256 }}
            animate={{ width: isCollapsed ? 80 : 256 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="bg-white border-r relative flex flex-col h-screen z-20 shadow-sm"
        >
            {/* Collapse Button */}
            <button
                onClick={toggleSidebar}
                className="absolute -right-3 top-8 bg-white border shadow-sm rounded-full p-1 text-gray-500 hover:text-gray-900 z-30"
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* Header */}
            <div className="p-6 mb-2">
                <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
                    {brandLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={brandLogo}
                            alt={brandName}
                            className="w-10 h-10 object-contain rounded"
                        />
                    ) : (
                        // Fallback to Beloop Logo
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src="/logo.png"
                            alt="Beloop"
                            className="w-10 h-10 object-contain rounded bg-rose-50 p-1"
                        />
                    )}

                    <AnimatePresence>
                        {!isCollapsed && (
                            <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                className="overflow-hidden whitespace-nowrap"
                            >
                                {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                                {/* @ts-ignore */}
                                {/* eslint-disable-next-line react-dom/no-unsafe-inline-style */}
                                <h2 className="text-lg font-bold truncate text-[var(--brand-color)]" style={{ '--brand-color': brandColor } as React.CSSProperties}>
                                    {brandName}
                                </h2>
                                <p className="text-xs text-gray-500">Brand Admin</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Navigation with Prefetch */}
            <nav className="flex-1 px-3 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onMouseEnter={() => handlePrefetch(item.href)}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative group",
                                isActive ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                                isCollapsed && "justify-center"
                            )}
                        >
                            <item.icon size={20} className={cn(isActive ? "text-gray-900" : "text-gray-500 group-hover:text-gray-900")} />

                            {!isCollapsed && (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="whitespace-nowrap"
                                >
                                    {item.label}
                                </motion.span>
                            )}

                            {/* Tooltip for collapsed state */}
                            {isCollapsed && (
                                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                                    {item.label}
                                </div>
                            )}
                        </Link>
                    );
                })}

                <div className="pt-4 mt-4 border-t border-gray-100">
                    <Link
                        href="/support"
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative group text-blue-600 hover:bg-blue-50",
                            isCollapsed && "justify-center"
                        )}
                    >
                        <HelpCircle size={20} />
                        {!isCollapsed && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="whitespace-nowrap"
                            >
                                Help & Support
                            </motion.span>
                        )}
                    </Link>
                </div>
            </nav>

            {/* Footer / User */}
            <div className="p-4 border-t bg-gray-50/50">
                <div className={cn("flex items-center gap-3", isCollapsed ? "justify-center" : "")}>
                    <UserButton
                        afterSignOutUrl="/"
                        appearance={{
                            elements: {
                                avatarBox: "w-9 h-9",
                                userButtonPopoverCard: "shadow-xl"
                            }
                        }}
                    />

                    {!isCollapsed && (
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-gray-900 truncate">{userName || "User"}</p>
                            <p className="text-xs text-gray-400 truncate">Manage Account</p>
                        </div>
                    )}
                </div>
            </div>
        </motion.aside>
    );
}

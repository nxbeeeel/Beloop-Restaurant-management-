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
    LogOut,
    Utensils
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/LogoutButton";

interface SidebarProps {
    brandName: string;
    brandLogo?: string | null;
    brandColor: string;
    userName?: string | null;
}

export function Sidebar({ brandName, brandLogo, brandColor, userName }: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();

    const toggleSidebar = () => setIsCollapsed(!isCollapsed);

    const navItems = [
        { href: "/brand/dashboard", label: "Overview", icon: LayoutDashboard },
        { href: "/brand/outlets", label: "Outlets", icon: Store },
        { href: "/brand/products", label: "Menu", icon: Utensils },
        { href: "/brand/staff", label: "Staff", icon: Users },
        { href: "/brand/reports", label: "Reports", icon: FileBarChart },
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
                                <h2 className="text-lg font-bold truncate" style={{ color: brandColor }}>
                                    {brandName}
                                </h2>
                                <p className="text-xs text-gray-500">Brand Admin</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
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
                <div className={cn("flex flex-col gap-3", isCollapsed ? "items-center" : "items-stretch")}>

                    {/* User Info */}
                    <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-sm">
                            {userName?.charAt(0) || "U"}
                        </div>

                        {!isCollapsed && (
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
                                <p className="text-xs text-gray-400 truncate">Administrator</p>
                            </div>
                        )}
                    </div>

                    {/* Logout Button */}
                    <div className={cn("pt-2", isCollapsed && "pt-0")}>
                        {isCollapsed ? (
                            <LogoutButton variant="ghost" size="icon" showText={false} />
                        ) : (
                            <LogoutButton variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" />
                        )}
                    </div>
                </div>
            </div>
        </motion.aside>
    );
}

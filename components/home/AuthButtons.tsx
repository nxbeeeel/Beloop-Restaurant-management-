"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { LayoutDashboard, Loader2 } from "lucide-react";

export function AuthButtons() {
    const { isSignedIn, isLoaded } = useUser();

    if (!isLoaded) {
        return (
            <div className="flex items-center gap-3">
                <div className="h-9 w-24 bg-white/5 animate-pulse rounded-md" />
                <div className="h-9 w-28 bg-white/10 animate-pulse rounded-full" />
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3">
            {isSignedIn ? (
                <Link
                    href="/super/dashboard"
                    className="text-sm font-medium text-white bg-white/10 border border-white/10 hover:bg-white/20 px-4 py-2 rounded-md transition-colors flex items-center gap-2"
                >
                    <LayoutDashboard className="w-4 h-4" />
                    Command Center
                </Link>
            ) : (
                <Link
                    href="/login"
                    className="text-sm font-medium text-gray-300 hover:text-white px-4 py-2 rounded-md hover:bg-white/5 transition-colors"
                >
                    Log in
                </Link>
            )}

            {!isSignedIn && (
                <Link
                    href="#apply"
                    className="bg-white text-black hover:bg-gray-200 font-semibold rounded-full px-5 py-2 transition-all hover:scale-105 active:scale-95"
                >
                    Get Access
                </Link>
            )}
        </div>
    );
}

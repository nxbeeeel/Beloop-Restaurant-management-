'use client';

import { useSession } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export function LaunchDashboardButton({ targetUrl }: { targetUrl: string }) {
    const { session } = useSession();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleLaunch = async () => {
        setIsLoading(true);
        try {
            // 1. Force Token Refresh to get latest claims (Org ID, Roles)
            if (session) {
                console.log("Refreshing session token...");
                await session.reload();
                await session.getToken({ skipCache: true }); // Double force
            }

            // 2. Hard Redirect (Reliable)
            console.log("Navigating to:", targetUrl);
            window.location.href = targetUrl;
        } catch (error) {
            console.error("Failed to refresh/navigate", error);
            // Fallback
            window.location.href = targetUrl;
        }
    };

    return (
        <button
            onClick={handleLaunch}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition-colors shadow-md flex justify-center items-center"
        >
            {isLoading ? (
                <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Syncing & Launching...
                </>
            ) : (
                "Launch Dashboard"
            )}
        </button>
    );
}

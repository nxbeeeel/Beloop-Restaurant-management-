'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';

interface SessionSyncRedirectProps {
    targetPath: string;
}

export function SessionSyncRedirect({ targetPath }: SessionSyncRedirectProps) {
    const router = useRouter();
    const { user, isLoaded } = useUser();

    useEffect(() => {
        const syncAndRedirect = async () => {
            if (isLoaded && user) {
                try {
                    console.log("🔄 Syncing session before redirect...");
                    await user.reload(); // Force token refresh
                    console.log("✅ Session synced. Redirecting to:", targetPath);
                    router.push(targetPath);
                    router.refresh();
                } catch (error) {
                    console.error("Session sync failed:", error);
                    // Fallback redirect anyway
                    router.push(targetPath);
                }
            }
        };

        syncAndRedirect();
    }, [isLoaded, user, router, targetPath]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50">
            <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-rose-600" />
                <h2 className="text-xl font-semibold text-stone-800">Syncing your profile...</h2>
                <p className="text-stone-500">Please wait while we update your permissions.</p>
            </div>
        </div>
    );
}

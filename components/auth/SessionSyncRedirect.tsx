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

                    // Check if role is actually present in publicMetadata
                    const role = user.publicMetadata.role || user.unsafeMetadata?.role;

                    if (!role) {
                        console.log("⏳ Role not yet propagated. Retrying in 2 seconds...");
                        setTimeout(syncAndRedirect, 2000);
                        return;
                    }

                    console.log(`✅ Session synced with ROLE: ${role}. Redirecting to:`, targetPath);
                    // Use window.location to force full browser reload/cookie sync
                    window.location.href = targetPath;
                } catch (error) {
                    console.error("Session sync failed:", error);
                    // Fallback to router push if reload fails
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
                <h2 className="text-xl font-semibold text-stone-800">Finalizing Setup...</h2>
                <p className="text-stone-500">Syncing your account permissions. This may take a moment.</p>
                <div className="text-xs text-stone-400 mt-4">
                    Waiting for Role Assignment...
                </div>
            </div>
        </div>
    );
}

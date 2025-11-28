'use client';

import { useEffect, useState } from 'react';
import { useUser, useSession } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { syncUserMetadata } from '@/server/actions/onboarding';

export default function OnboardingSync() {
    const { user, isLoaded } = useUser();
    const { session } = useSession();
    const router = useRouter();
    const [status, setStatus] = useState('Checking account status...');

    useEffect(() => {
        if (!isLoaded || !user || !session) return;

        const checkAndRedirect = async () => {
            // Check if metadata is already correct
            if (user.publicMetadata.onboardingComplete) {
                setStatus('Redirecting to dashboard...');
                const role = user.publicMetadata.role as string;

                // Force a session refresh to ensure the cookie is updated
                await session.touch();

                // Use window.location.href to force a full page load
                if (role === 'SUPER') window.location.href = '/super/dashboard';
                else if (role === 'BRAND_ADMIN') window.location.href = '/brand/dashboard';
                else window.location.href = '/outlet/dashboard';
                return;
            }

            // If not, try to sync
            setStatus('Syncing account data...');
            const result = await syncUserMetadata();

            if (result.success) {
                setStatus('Updating session...');
                // Force token refresh
                await session.touch();
                await user.reload();
                // The next useEffect run will catch the updated metadata
            } else {
                setStatus('Error: ' + result.error);
            }
        };

        checkAndRedirect();
    }, [isLoaded, user, session, router]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground mb-2">{status}</p>
            <div className="text-xs text-gray-400 max-w-md bg-gray-100 p-2 rounded text-left overflow-auto">
                <p>Debug Info:</p>
                <pre>{JSON.stringify({
                    isLoaded,
                    hasUser: !!user,
                    hasSession: !!session,
                    metadata: user?.publicMetadata,
                    onboardingComplete: user?.publicMetadata?.onboardingComplete
                }, null, 2)}</pre>
            </div>
        </div>
    );
}

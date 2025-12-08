import { useClerk } from "@clerk/nextjs";

/**
 * Hook to force a session refresh for the current user.
 * This fetches the latest token claims from Clerk (e.g., renewed role metadata).
 * 
 * Usage:
 * const { refreshSession, loading } = useSessionRefresh();
 * <button onClick={refreshSession}>Refresh Permissions</button>
 */
import { useState } from 'react';

export function useSessionRefresh() {
    const { session } = useClerk();
    const [loading, setLoading] = useState(false);

    const refreshSession = async () => {
        if (!session) return;

        console.log('[SESSION] Refreshing session token...');
        setLoading(true);
        try {
            // Force reload of the user object and touch session to get new token
            await session.touch();
            await session.user.reload();
            console.log('[SESSION] Token refreshed successfully');

            // Optional: force a router refresh to re-run server components
            window.location.reload();
        } catch (error) {
            console.error('[SESSION] Failed to refresh token:', error);
        } finally {
            setLoading(false);
        }
    };

    return { refreshSession, loading };
}

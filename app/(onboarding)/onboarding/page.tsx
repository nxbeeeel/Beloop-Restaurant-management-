'use client';

import { useUser, useSession, UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, RefreshCw, Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * ONBOARDING PAGE - TERMINAL STATE
 * 
 * Contract:
 * - This page does NOT redirect. Middleware is the only source of routing.
 * - If user is provisioned, middleware will redirect them away before they see this.
 * - If user reaches this page, they are NOT provisioned and should wait here.
 * - The "Refresh Status" button reloads the session to pick up new JWT claims.
 */
export default function OnboardingPage() {
    const { user, isLoaded: isUserLoaded } = useUser();
    const { session, isLoaded: isSessionLoaded } = useSession();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error' | 'checked'>('idle');

    // Query for pending invitation (optional enhancement)
    const { data: pendingInvite, isLoading: isLoadingInvite } = trpc.public.getPendingInvitation.useQuery(
        undefined,
        { enabled: isUserLoaded && !!user }
    );

    // Sync user metadata on mount (if they have a DB role but stale JWT)
    const syncMutation = trpc.public.syncUserMetadata.useMutation({
        onSuccess: (data) => {
            if (data.synced) {
                setSyncStatus('synced');

                // ✅ ENTERPRISE FIX: Direct Redirect from DB State
                if (data.onboardingStatus === 'COMPLETED') {
                    console.log('[Onboarding] DB confirms COMPLETED. Redirecting with bypass...');
                    const bypassQuery = data.bypassToken ? `?t=${data.bypassToken}` : '';
                    window.location.href = `/${bypassQuery}`; // Middleware handles routing
                    return;
                }

                // Only refresh if DB says not ready (rare edge case or lagging)
                handleRefreshStatus();
            } else {
                console.log('[Onboarding] User not ready in DB yet:', data.reason);
                // Mark as checked so we don't loop, but don't redirect
                setSyncStatus('checked');
            }
        },
        onError: () => {
            setSyncStatus('error');
        }
    });

    // Complete Onboarding Mutation
    const completeMutation = trpc.public.completeOnboarding.useMutation({
        onSuccess: (data) => {
            console.log('[Onboarding] Setup completed successfully. Redirecting...');
            window.location.href = `/?t=${data.bypassToken}`;
        },
        onError: (err) => {
            console.error('[Onboarding] Failed to complete setup:', err);
            alert("Failed to complete setup: " + err.message);
        }
    });

    useEffect(() => {
        // Auto-sync on mount if user is loaded
        if (isUserLoaded && user && syncStatus === 'idle') {
            setSyncStatus('syncing');
            syncMutation.mutate();
        }
    }, [isUserLoaded, user, syncStatus]);

    const handleRefreshStatus = async () => {
        if (!session) return;
        setIsRefreshing(true);
        try {
            // Reload session to get fresh JWT claims from Clerk
            await session.reload();
            // Force fresh token with retry - Clerk needs time to propagate metadata
            let attempts = 0;
            const maxAttempts = 3;

            while (attempts < maxAttempts) {
                await new Promise(r => setTimeout(r, 1500)); // Wait 1.5s for propagation
                const token = await session.getToken({ skipCache: true });

                // Parse JWT to check if is_provisioned is now true
                if (token) {
                    try {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        const metadata = payload.metadata || {};

                        // ✅ ENTERPRISE FIX: Only redirect if onboarding is strictly COMPLETED
                        if (metadata.onboardingStatus === 'COMPLETED') {
                            console.log('[Onboarding] Status is COMPLETED, redirecting to dashboard');
                            window.location.href = '/';
                            return;
                        }
                        console.log(`[Onboarding] Status: ${metadata.onboardingStatus}. Staying on page.`);
                    } catch (e) {
                        console.error('[Onboarding] Failed to parse JWT:', e);
                    }
                }
                attempts++;
                // console.log(`[Onboarding] JWT not updated yet, attempt ${attempts}/${maxAttempts}`);
            }

            // If we're here, we are synced but NOT completed.
            // Do NOT redirect. Just let the UI render.
            console.log('[Onboarding] Check complete. Status still not COMPLETED. No redirect.');
            setIsRefreshing(false);
            // window.location.href = '/'; // REMOVED HARD REDIRECT
        } catch (error) {
            console.error('[Onboarding] Failed to refresh session:', error);
            setIsRefreshing(false);
        }
    };

    // Loading state
    if (!isUserLoaded || !isSessionLoaded) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
            </div>
        );
    }

    const firstName = user?.firstName || "User";
    const email = user?.primaryEmailAddress?.emailAddress;

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 flex flex-col items-center pt-20 px-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-600/5 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md bg-stone-900/80 backdrop-blur-xl border border-stone-800 rounded-2xl shadow-2xl p-8 text-center space-y-6">
                <div className="flex justify-center mb-4">
                    <UserButton afterSignOutUrl="/login" />
                </div>

                <h1 className="text-2xl font-bold text-white">Welcome, {firstName}!</h1>

                {/* Sync Status Indicator */}
                {syncStatus === 'syncing' && (
                    <div className="flex items-center justify-center gap-2 text-stone-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Checking your access...</span>
                    </div>
                )}
                {syncStatus === 'synced' && (
                    <div className="flex items-center justify-center gap-2 text-emerald-400">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">Account synced</span>
                    </div>
                )}

                {/* Pending Invitation */}
                {isLoadingInvite ? (
                    <div className="bg-stone-800/50 rounded-xl p-4 animate-pulse">
                        <div className="h-4 bg-stone-700 rounded w-3/4 mx-auto" />
                    </div>
                ) : pendingInvite ? (
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-left">
                        <h3 className="font-semibold text-rose-400 mb-2 flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Pending Invitation
                        </h3>
                        <p className="text-sm text-stone-300">
                            You have a pending invitation to join <strong className="text-white">{pendingInvite.tenantName}</strong>.
                        </p>
                        <a
                            href={`/invite/user?token=${pendingInvite.token}`}
                            className="mt-4 block w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition-colors text-center"
                        >
                            Accept Invitation
                        </a>
                    </div>
                ) : (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-left">
                        <h3 className="font-semibold text-amber-400 mb-2">Setup Incomplete</h3>
                        <p className="text-sm text-stone-300 mb-4">
                            Your organization is created but setup is not marked as complete.
                        </p>
                        {syncStatus === 'synced' && (
                            <Button
                                onClick={() => completeMutation.mutate()}
                                disabled={completeMutation.isPending}
                                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                            >
                                {completeMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Completing Setup...
                                    </>
                                ) : (
                                    "Complete Setup & Enter Dashboard"
                                )}
                            </Button>
                        )}
                    </div>
                )}

                {/* Refresh Status Button */}
                <Button
                    onClick={handleRefreshStatus}
                    disabled={isRefreshing}
                    className="w-full bg-stone-800 hover:bg-stone-700 text-white border border-stone-700"
                >
                    {isRefreshing ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Checking...
                        </>
                    ) : (
                        <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh Status
                        </>
                    )}
                </Button>

                {/* Debug Info */}
                <details className="text-left bg-stone-800/50 rounded-lg p-3">
                    <summary className="text-xs text-stone-500 cursor-pointer">Debug Info (tap to expand)</summary>
                    <div className="mt-2 text-xs text-stone-400 space-y-1 font-mono">
                        <p>Clerk ID: {user?.id?.slice(0, 20)}...</p>
                        <p>Email: {email}</p>
                        <p>Sync Status: {syncStatus}</p>
                    </div>
                </details>

                <div className="pt-4 border-t border-stone-800">
                    <p className="text-xs text-stone-500">
                        Need help? Contact <a href="mailto:support@beloop.app" className="text-rose-400 hover:underline">support@beloop.app</a>
                    </p>
                </div>
            </div>
        </div>
    );
}

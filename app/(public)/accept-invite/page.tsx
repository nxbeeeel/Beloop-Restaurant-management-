'use client';

import { useSession, useUser } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Suspense } from 'react';

function AcceptInviteContent() {
    const { session, isLoaded: isSessionLoaded } = useSession();
    const { user, isLoaded: isUserLoaded } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState('Verifying your invitation...');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        // Wait for both session and user to load
        if (!isSessionLoaded || !isUserLoaded) return;

        // Prevent double-processing
        if (isProcessing) return;
        setIsProcessing(true);

        const processInvitation = async () => {
            try {
                // Check Clerk's internal status
                const clerkStatus = searchParams.get('__clerk_status');

                if (clerkStatus === 'complete' || session) {
                    setStatus('Syncing your permissions...');

                    // STEP 1: FORCE SESSION RELOAD to get new claims
                    if (session) {
                        await session.reload();
                        // Force a fresh token
                        await session.getToken({ skipCache: true });
                    }

                    setStatus('Finalizing access...');

                    // Small delay to ensure token propagation
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // STEP 2: Navigate to home and let middleware route to correct dashboard
                    // This eliminates duplicate routing logic - middleware is the single source of truth
                    setStatus('Redirecting to your dashboard...');
                    window.location.href = '/';
                } else {
                    // Not authenticated - redirect to login
                    setStatus('Please sign in to accept this invitation...');
                    const currentUrl = window.location.href;
                    window.location.href = `/login?redirect_url=${encodeURIComponent(currentUrl)}`;
                }
            } catch (error) {
                console.error('Error processing invitation:', error);
                setStatus('Error processing invitation. Redirecting...');
                window.location.href = '/';
            }
        };

        processInvitation();
    }, [isSessionLoaded, isUserLoaded, session, user, searchParams, isProcessing, router]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-600/5 rounded-full blur-3xl" />
            </div>

            <div className="relative bg-stone-900/80 backdrop-blur-xl border border-stone-800 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center space-y-6">
                {/* Spinner */}
                <div className="flex justify-center">
                    <div className="w-12 h-12 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-white">Processing Invitation</h1>
                    <p className="text-stone-400">{status}</p>
                </div>

                <div className="pt-4 border-t border-stone-800">
                    <p className="text-xs text-stone-500">
                        This may take a few seconds. Please don't refresh.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function AcceptInvitePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
            </div>
        }>
            <AcceptInviteContent />
        </Suspense>
    );
}

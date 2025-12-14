'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Error Boundary for Onboarding Page
 * Catches crashes and prevents blank white screen
 */
export default function OnboardingError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log error details
        console.error('[Onboarding Error]', {
            message: error.message,
            stack: error.stack,
            digest: error.digest,
        });
        // Report to Sentry
        Sentry.captureException(error, {
            tags: { page: 'onboarding' },
        });
    }, [error]);

    const handleRetry = () => {
        reset();
    };

    const handleGoHome = () => {
        window.location.href = '/';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-600/5 rounded-full blur-3xl" />
            </div>

            <div className="relative bg-stone-900/80 backdrop-blur-xl border border-stone-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center space-y-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20">
                    <AlertTriangle className="h-8 w-8 text-rose-500" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
                    <p className="text-stone-400">
                        We encountered an error loading your onboarding status.
                    </p>
                </div>

                {/* Error Details (collapsed by default) */}
                <details className="text-left bg-stone-800/50 rounded-lg p-3">
                    <summary className="text-xs text-stone-500 cursor-pointer">
                        Technical Details
                    </summary>
                    <div className="mt-2 text-xs text-rose-400 font-mono break-all">
                        {error.message}
                    </div>
                    {error.digest && (
                        <div className="mt-1 text-xs text-stone-500 font-mono">
                            Error ID: {error.digest}
                        </div>
                    )}
                </details>

                <div className="flex flex-col gap-3">
                    <Button
                        onClick={handleRetry}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                    </Button>
                    <Button
                        onClick={handleGoHome}
                        variant="outline"
                        className="w-full border-stone-700 text-stone-300 hover:bg-stone-800"
                    >
                        Go to Home
                    </Button>
                </div>

                <div className="pt-4 border-t border-stone-800">
                    <p className="text-xs text-stone-500">
                        If this persists, contact{' '}
                        <a href="mailto:support@beloop.app" className="text-rose-400 hover:underline">
                            support@beloop.app
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

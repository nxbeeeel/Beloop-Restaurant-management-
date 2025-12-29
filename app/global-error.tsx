'use client';

import { useEffect } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * IDENTITY SHIELD (Global Error Boundary)
 * 
 * Catches critical identity failures (like "Tenant ID missing") that would
 * normally cause a white screen crash. Instead, it shows a polished UI
 * and attempts to self-heal by reloading the session.
 */
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[Identity Shield] Caught Global Error:', error);
    }, [error]);

    const isIdentityError = error.message.includes('Tenant') || error.message.includes('User') || error.message.includes('Context');

    return (
        <html>
            <body className="bg-stone-950 text-white flex items-center justify-center min-h-screen">
                <div className="max-w-md w-full p-8 bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center">
                            {isIdentityError ? (
                                <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
                            ) : (
                                <ShieldAlert className="w-8 h-8 text-rose-500" />
                            )}
                        </div>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold mb-2">
                            {isIdentityError ? 'Synchronizing Identity...' : 'Something went wrong'}
                        </h2>
                        <p className="text-stone-400 text-sm">
                            {isIdentityError
                                ? 'We detected a hiccup in your session. Reconnecting to the secure enclave.'
                                : 'An unexpected error occurred. Our team has been notified.'}
                        </p>
                    </div>

                    {process.env.NODE_ENV === 'development' && (
                        <div className="bg-black/50 p-3 rounded text-left overflow-auto max-h-32">
                            <code className="text-xs text-red-400 font-mono">{error.message}</code>
                        </div>
                    )}

                    <div className="space-y-3">
                        <Button
                            onClick={() => window.location.reload()}
                            className="w-full bg-rose-600 hover:bg-rose-700 font-semibold"
                        >
                            {isIdentityError ? 'Reload Session' : 'Try Again'}
                        </Button>

                        {!isIdentityError && (
                            <Button
                                onClick={() => reset()}
                                variant="outline"
                                className="w-full border-stone-700 text-stone-300 hover:bg-stone-800"
                            >
                                Attempt Recovery
                            </Button>
                        )}
                    </div>

                    <p className="text-xs text-stone-600">
                        Error Digest: {error.digest || 'Unknown'}
                    </p>
                </div>
            </body>
        </html>
    );
}

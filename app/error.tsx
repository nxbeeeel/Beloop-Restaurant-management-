'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
        // Report to Sentry
        Sentry.captureException(error);
    }, [error]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-gray-100 text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>

                <h2 className="mb-2 text-2xl font-bold tracking-tight text-gray-900">
                    Something went wrong
                </h2>

                <p className="mb-8 text-gray-500">
                    We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
                </p>

                <div className="flex flex-col gap-3">
                    <Button
                        onClick={() => reset()}
                        className="w-full bg-gray-900 hover:bg-gray-800"
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try again
                    </Button>

                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-4 rounded-md bg-red-50 p-4 text-left">
                            <p className="text-xs font-mono text-red-800 break-words">
                                {error.message}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

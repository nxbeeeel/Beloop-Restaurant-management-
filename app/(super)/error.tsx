'use client';

import { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCw, Home } from "lucide-react";
import Link from 'next/link';

export default function SuperError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Super Admin Crash:', error);
    }, [error]);

    return (
        <div className="flex h-screen flex-col items-center justify-center p-8 bg-stone-50/50">
            <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-red-100 p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-stone-900">System Error</h2>
                    <p className="text-stone-500 text-sm">
                        An unexpected error occurred in the Super Admin module.
                    </p>
                    {error.message && (
                        <div className="bg-stone-50 p-2 rounded text-xs font-mono text-stone-600 border border-stone-200 mt-2 overflow-auto max-h-32">
                            {error.message}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3 pt-2">
                    <Button
                        onClick={() => reset()}
                        className="w-full bg-stone-900 hover:bg-stone-800"
                    >
                        <RotateCw className="w-4 h-4 mr-2" />
                        Try Again
                    </Button>
                    <Link href="/" className="w-full">
                        <Button variant="outline" className="w-full">
                            <Home className="w-4 h-4 mr-2" />
                            Return Home
                        </Button>
                    </Link>
                </div>

                <div className="text-xs text-stone-400 pt-4 border-t">
                    Error ID: {error.digest || 'N/A'}
                </div>
            </div>
        </div>
    );
}

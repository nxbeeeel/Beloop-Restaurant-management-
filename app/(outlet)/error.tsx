'use client';

import { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { XCircle, RefreshCw } from "lucide-react";

export default function OutletError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Outlet Operations Crash:', error);
    }, [error]);

    return (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="bg-red-50 p-4 rounded-full mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
            </div>

            <h2 className="text-xl font-bold text-stone-900 mb-2">Something went wrong</h2>
            <p className="text-stone-500 mb-6 max-w-xs mx-auto">
                The application encountered an error. This has been logged.
            </p>

            <Button
                onClick={() => reset()}
                className="bg-rose-600 hover:bg-rose-700 w-full max-w-[200px]"
            >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Page
            </Button>
        </div>
    );
}

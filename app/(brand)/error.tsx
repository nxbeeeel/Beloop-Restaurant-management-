'use client';

import { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, LayoutDashboard } from "lucide-react";
import Link from 'next/link';

export default function BrandError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Brand Console Crash:', error);
    }, [error]);

    return (
        <div className="flex h-[80vh] flex-col items-center justify-center p-6 bg-transparent">
            <div className="w-full max-w-sm text-center space-y-5">
                <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center mx-auto border border-amber-100">
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>

                <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-stone-900">Console Error</h2>
                    <p className="text-stone-500 text-sm">
                        We encountered an issue loading your Brand Dashboard.
                    </p>
                </div>

                <div className="flex gap-2 justify-center">
                    <Button
                        onClick={() => reset()}
                        variant="default"
                        className="bg-stone-900"
                    >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Retry
                    </Button>
                    <Link href="/brand/dashboard">
                        <Button variant="ghost">
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            Dashboard
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

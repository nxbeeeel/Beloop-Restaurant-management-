'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <html>
            <body className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 font-sans antialiased">
                <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-gray-100 text-center">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>

                    <h2 className="mb-2 text-2xl font-bold tracking-tight text-gray-900">
                        Critical System Error
                    </h2>

                    <p className="mb-8 text-gray-500">
                        A fatal error occurred. The application cannot recover automatically.
                    </p>

                    <Button
                        onClick={() => reset()}
                        className="w-full bg-gray-900 hover:bg-gray-800"
                    >
                        Reload Application
                    </Button>
                </div>
            </body>
        </html>
    );
}

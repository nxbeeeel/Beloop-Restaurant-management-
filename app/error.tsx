"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function Error({
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
        <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-4">
            <div className="flex max-w-md flex-col items-center text-center">
                <div className="mb-4 rounded-full bg-red-100 p-3">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-gray-900">Something went wrong!</h2>
                <p className="mb-6 text-gray-600">
                    We apologize for the inconvenience. An unexpected error has occurred.
                </p>
                <div className="flex gap-4">
                    <Button onClick={() => window.location.reload()} variant="outline">
                        Refresh Page
                    </Button>
                    <Button onClick={() => reset()}>Try Again</Button>
                </div>
                {process.env.NODE_ENV === "development" && (
                    <div className="mt-8 w-full overflow-hidden rounded bg-gray-900 p-4 text-left text-xs text-red-400">
                        <pre className="whitespace-pre-wrap">{error.message}</pre>
                        {error.digest && <p className="mt-2 text-gray-500">Digest: {error.digest}</p>}
                    </div>
                )}
            </div>
        </div>
    );
}

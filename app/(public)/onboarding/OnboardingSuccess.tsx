'use client';

import { useState } from 'react';
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { completeOnboarding } from "@/server/actions/onboarding";
import { Loader2 } from "lucide-react";

export default function OnboardingSuccess() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { user } = useUser();

    const handleComplete = async () => {
        console.log("Button clicked: Starting onboarding completion...");
        setLoading(true);
        setError(null);

        try {
            // 1. Trigger server action to update metadata in Clerk
            const formData = new FormData();
            const result = await completeOnboarding(formData);

            if (result && result.success && result.redirectUrl) {
                console.log("Action successful. Waiting for session update...");

                // 2. Poll for session update (max 10 attempts)
                let attempts = 0;
                const maxAttempts = 10;

                while (attempts < maxAttempts) {
                    console.log(`Polling session attempt ${attempts + 1}/${maxAttempts}...`);
                    await user?.reload();

                    // Check if the metadata is actually updated on the client object
                    // @ts-ignore - publicMetadata is not always typed correctly in the client object depending on version
                    if (user?.publicMetadata?.onboardingComplete === true) {
                        console.log("Session updated! Redirecting to:", result.redirectUrl);
                        window.location.href = result.redirectUrl;
                        return;
                    }

                    // Wait 1 second before next attempt
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    attempts++;
                }

                // If we get here, it timed out, but we'll try redirecting anyway as a fallback
                console.warn("Polling timed out. Attempting redirect anyway...");
                window.location.href = result.redirectUrl;
            }
        } catch (err) {
            console.error("Onboarding action failed:", err);
            setError(err instanceof Error ? err.message : "Failed to complete onboarding");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center space-y-6">
                <h1 className="text-2xl font-bold text-gray-900">Account Setup Complete</h1>
                <p className="text-gray-600">
                    Your account is ready. Click below to access your dashboard.
                </p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
                        {error}
                    </div>
                )}

                <Button
                    onClick={handleComplete}
                    className="w-full"
                    size="lg"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Redirecting...
                        </>
                    ) : (
                        "Go to Dashboard"
                    )}
                </Button>
            </div>
        </div>
    );
}

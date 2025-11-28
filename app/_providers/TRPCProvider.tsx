"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import superjson from "superjson";

export function TRPCProvider({ children }: { children: React.ReactNode }) {
    // ⚡ PERFORMANCE OPTIMIZATION: Aggressive caching for instant navigation
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh, no refetch
                gcTime: 10 * 60 * 1000, // 10 minutes - cache persists in memory
                refetchOnWindowFocus: false, // Don't refetch when switching tabs
                refetchOnMount: false, // Don't refetch when component mounts
                refetchOnReconnect: false, // Don't refetch on network reconnect
                retry: 1, // Only retry once on failure (faster error handling)
            },
            mutations: {
                retry: 1, // Only retry mutations once
            },
        },
    }));
    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                httpBatchLink({
                    url: typeof window !== 'undefined'
                        ? `${window.location.origin}/api/trpc`
                        : `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/trpc`,
                    transformer: superjson,
                }),
            ],
        })
    );

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </trpc.Provider>
    );
}

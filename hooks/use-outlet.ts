"use client";

import { trpc } from "@/lib/trpc";

export function useOutlet() {
    const { data: user, isLoading, error } = trpc.dashboard.getUser.useQuery(undefined, {
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
        retry: 1
    });

    return {
        outletId: user?.outletId || null,
        isLoading,
        error,
        user
    };
}

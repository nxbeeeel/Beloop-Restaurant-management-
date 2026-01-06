"use client";

import { cn } from "@/lib/utils";

/**
 * Skeleton Loading Components
 * 
 * For zero-lag perceived performance
 */

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-lg bg-slate-700/50",
                className
            )}
        />
    );
}

export function SkeletonCard({ className }: SkeletonProps) {
    return (
        <div className={cn("rounded-xl border border-slate-700 bg-slate-800/50 p-6", className)}>
            <div className="space-y-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
            </div>
        </div>
    );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
    return (
        <div className="space-y-2">
            {/* Header */}
            <div className="flex gap-4 pb-2 border-b border-slate-700">
                {[...Array(cols)].map((_, i) => (
                    <Skeleton key={i} className="h-4 flex-1" />
                ))}
            </div>
            {/* Rows */}
            {[...Array(rows)].map((_, i) => (
                <div key={i} className="flex gap-4 py-2">
                    {[...Array(cols)].map((_, j) => (
                        <Skeleton key={j} className="h-8 flex-1" />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function SkeletonDashboard() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-32" />
            </div>

            {/* Metric Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
            </div>

            {/* Main Content */}
            <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <SkeletonTable rows={5} cols={4} />
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <SkeletonTable rows={5} cols={3} />
                </div>
            </div>
        </div>
    );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {[...Array(count)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                </div>
            ))}
        </div>
    );
}

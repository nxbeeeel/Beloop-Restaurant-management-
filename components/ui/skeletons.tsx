// Reusable Loading Skeleton Components
// Provides instant visual feedback while data loads

import React from 'react';

// ============================================
// BASE SKELETON COMPONENTS
// ============================================

export function Skeleton({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={`animate-pulse bg-gray-200 rounded ${className}`}
            {...props}
        />
    );
}

export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
            ))}
        </div>
    );
}

// ============================================
// PAGE-SPECIFIC SKELETONS
// ============================================

export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white p-6 rounded-lg shadow">
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-8 w-32" />
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div className="bg-white p-6 rounded-lg shadow">
                <Skeleton className="h-6 w-48 mb-4" />
                <Skeleton className="h-64 w-full" />
            </div>

            {/* Recent Activity */}
            <div className="bg-white p-6 rounded-lg shadow">
                <Skeleton className="h-6 w-48 mb-4" />
                <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
            </div>
        </div>
    );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
    return (
        <div className="border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gray-50 p-4 grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton key={i} className="h-4" />
                ))}
            </div>

            {/* Rows */}
            <div className="divide-y">
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <div key={rowIndex} className="p-4 grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                        {Array.from({ length: columns }).map((_, colIndex) => (
                            <Skeleton key={colIndex} className="h-4" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function CardSkeleton() {
    return (
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <Skeleton className="h-6 w-48" />
            <SkeletonText lines={3} />
            <div className="flex gap-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
            </div>
        </div>
    );
}

export function FormSkeleton() {
    return (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <Skeleton className="h-8 w-64" />

            {/* Form Fields */}
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ))}

            {/* Buttons */}
            <div className="flex gap-3">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
            </div>
        </div>
    );
}

export function ProductListSkeleton({ count = 10 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                </div>
            ))}
        </div>
    );
}

export function SalesEntrySkeleton() {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <Skeleton className="h-8 w-64" />

            {/* Sales Form */}
            <div className="bg-white p-6 rounded-lg shadow space-y-6">
                <Skeleton className="h-6 w-48" />

                {/* Sales Fields */}
                <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Expenses */}
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
                <Skeleton className="h-6 w-48" />
                <TableSkeleton rows={3} columns={4} />
            </div>

            {/* Submit Button */}
            <Skeleton className="h-12 w-full" />
        </div>
    );
}

export function InventorySkeleton() {
    return (
        <div className="space-y-6">
            {/* Header with Search */}
            <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-64" />
            </div>

            {/* Filters */}
            <div className="flex gap-3">
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-10 w-32" />
                ))}
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-white p-4 rounded-lg shadow space-y-3">
                        <Skeleton className="h-32 w-full rounded" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-4 w-24" />
                        <div className="flex gap-2">
                            <Skeleton className="h-8 flex-1" />
                            <Skeleton className="h-8 w-8" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function ReportSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-10 w-48" />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white p-6 rounded-lg shadow space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div className="bg-white p-6 rounded-lg shadow">
                <Skeleton className="h-6 w-48 mb-4" />
                <Skeleton className="h-80 w-full" />
            </div>

            {/* Data Table */}
            <div className="bg-white p-6 rounded-lg shadow">
                <Skeleton className="h-6 w-48 mb-4" />
                <TableSkeleton rows={10} columns={6} />
            </div>
        </div>
    );
}

// ============================================
// USAGE EXAMPLES
// ============================================

/*
// In your page component:

import { DashboardSkeleton } from '@/components/ui/skeletons';

export default function DashboardPage() {
    const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
    
    if (isLoading) {
        return <DashboardSkeleton />;
    }
    
    return (
        <div>
            {/* Your actual content *\/}
        </div>
    );
}

// For lists with loading states:

const { data, isLoading, isFetching } = trpc.products.list.useQuery();

if (isLoading) return <ProductListSkeleton />;

return (
    <div>
        {isFetching && <div className="opacity-50">Updating...</div>}
        {data.map(product => <ProductCard key={product.id} {...product} />)}
    </div>
);
*/

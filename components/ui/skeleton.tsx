/**
 * Skeleton Loader Components
 * Zero-lag UX: Shows instant visual feedback while data loads
 */
import { cn } from "@/lib/utils"

// Base Skeleton with shimmer animation
function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("animate-pulse rounded-md bg-muted", className)}
            {...props}
        />
    )
}

// Card Skeleton - For dashboard stat cards
function SkeletonCard({ className }: { className?: string }) {
    return (
        <div className={cn("rounded-xl border p-6 space-y-4", className)}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
        </div>
    );
}

// Table Row Skeleton
function SkeletonRow({ columns = 5 }: { columns?: number }) {
    return (
        <tr>
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <Skeleton className="h-4 w-full max-w-[120px]" />
                </td>
            ))}
        </tr>
    );
}

// Table Skeleton
function SkeletonTable({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
    return (
        <div className="rounded-lg border">
            <table className="w-full">
                <thead>
                    <tr className="border-b bg-neutral-50 dark:bg-neutral-800">
                        {Array.from({ length: columns }).map((_, i) => (
                            <th key={i} className="px-4 py-3 text-left">
                                <Skeleton className="h-4 w-20" />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rows }).map((_, i) => (
                        <SkeletonRow key={i} columns={columns} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// Dashboard Grid Skeleton
function SkeletonDashboard() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
            </div>
            <div className="rounded-xl border p-6">
                <Skeleton className="h-4 w-32 mb-4" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
    );
}

// Inventory List Skeleton
function SkeletonInventory() {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-32" />
            </div>
            <div className="flex gap-4">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-40" />
            </div>
            <SkeletonTable rows={10} columns={6} />
        </div>
    );
}

// Supplier List Skeleton
function SkeletonSupplierList() {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-10 w-36" />
            </div>
            <SkeletonTable rows={8} columns={5} />
        </div>
    );
}

// Form Skeleton
function SkeletonForm({ fields = 4 }: { fields?: number }) {
    return (
        <div className="space-y-6">
            {Array.from({ length: fields }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ))}
            <Skeleton className="h-10 w-32" />
        </div>
    );
}

export {
    Skeleton,
    SkeletonCard,
    SkeletonRow,
    SkeletonTable,
    SkeletonDashboard,
    SkeletonInventory,
    SkeletonSupplierList,
    SkeletonForm
}


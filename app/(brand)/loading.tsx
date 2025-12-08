import { Skeleton } from "@/components/ui/skeleton";

export default function BrandLoading() {
    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
            </div>

            <div className="rounded-xl border p-6 space-y-6">
                <div className="flex justify-between">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-6 w-24" />
                </div>
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex gap-4">
                        <Skeleton className="h-12 w-full" />
                    </div>
                ))}
            </div>
        </div>
    );
}

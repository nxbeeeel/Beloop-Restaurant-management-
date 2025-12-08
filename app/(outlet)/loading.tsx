import { Skeleton } from "@/components/ui/skeleton";

export default function OutletLoading() {
    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-8">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-32" />
            </div>

            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-4 p-4 border rounded-lg bg-white">
                        <Skeleton className="h-12 w-12 rounded bg-stone-100" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-4 w-1/4" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

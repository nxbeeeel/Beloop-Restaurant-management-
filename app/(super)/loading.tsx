import { Skeleton } from "@/components/ui/skeleton";

export default function SuperLoading() {
    return (
        <div className="flex-1 p-8 pt-20 md:pt-8 w-full max-w-[1600px] mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64 bg-stone-200" />
                    <Skeleton className="h-4 w-96 bg-stone-100" />
                </div>
                <Skeleton className="h-10 w-32 bg-stone-200" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-6 rounded-xl border bg-white shadow-sm space-y-2">
                        <div className="flex justify-between items-center">
                            <Skeleton className="h-4 w-24 bg-stone-100" />
                            <Skeleton className="h-4 w-4 bg-stone-100" />
                        </div>
                        <Skeleton className="h-8 w-16 bg-stone-200" />
                    </div>
                ))}
            </div>

            <div className="rounded-xl border bg-white p-6 h-[400px] space-y-4">
                <Skeleton className="h-6 w-48 bg-stone-100" />
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full bg-stone-50" />
                    ))}
                </div>
            </div>
        </div>
    );
}

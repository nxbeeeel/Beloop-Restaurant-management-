import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

export default function SalesLoading() {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Sales History
                    </h2>
                    <p className="text-muted-foreground">
                        <Skeleton className="h-4 w-[250px]" />
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Skeleton className="h-5 w-5 rounded-full" />
                        <Skeleton className="h-6 w-[150px]" />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <TableSkeleton rows={10} />
                </CardContent>
            </Card>
        </div>
    );
}

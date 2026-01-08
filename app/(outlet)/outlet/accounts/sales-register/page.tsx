"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, CreditCard, Banknote, Smartphone } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOutlet } from "@/hooks/use-outlet";

export default function SalesRegisterPage() {
    const { outletId, isLoading: outletLoading } = useOutlet();

    const { data: closures, isLoading: dataLoading } = trpc.dailyClosure.list.useQuery(
        { outletId: outletId || "" },
        { enabled: !!outletId }
    );

    const isLoading = outletLoading || dataLoading;

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <Skeleton className="h-4 w-24 mb-2" />
                                <Skeleton className="h-8 w-32" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-40" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const totalSales = closures?.reduce((sum, c) => sum + Number(c.totalSale || 0), 0) || 0;
    const cashSales = closures?.reduce((sum, c) => sum + Number(c.cashSale || 0), 0) || 0;

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold">Daily Sales Register</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Receipt className="h-4 w-4" />
                            Total Sales
                        </div>
                        <p className="text-2xl font-bold">₹{totalSales.toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Banknote className="h-4 w-4 text-green-500" />
                            Cash Sales
                        </div>
                        <p className="text-2xl font-bold text-green-600">₹{cashSales.toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <CreditCard className="h-4 w-4 text-blue-500" />
                            Card/Online
                        </div>
                        <p className="text-2xl font-bold text-blue-600">₹{(totalSales - cashSales).toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Smartphone className="h-4 w-4 text-purple-500" />
                            Days Recorded
                        </div>
                        <p className="text-2xl font-bold text-purple-600">{closures?.length || 0}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Sales Register History</CardTitle>
                </CardHeader>
                <CardContent>
                    {closures && closures.length > 0 ? (
                        <div className="space-y-2">
                            {closures.map((closure) => (
                                <div key={closure.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                    <div>
                                        <p className="font-medium">{new Date(closure.date).toLocaleDateString()}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Daily Closure
                                        </p>
                                    </div>
                                    <p className="font-bold">₹{Number(closure.totalSale || 0).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-8">No sales register entries yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

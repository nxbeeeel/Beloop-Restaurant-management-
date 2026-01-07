"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function CashFlowPage() {
    const { data: closures, isLoading } = trpc.dailyClosure.list.useQuery({
        outletId: "",
    });

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
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
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const totalSales = closures?.reduce((sum, c) => sum + Number(c.totalSale || 0), 0) || 0;
    const totalExpenses = closures?.reduce((sum, c) => sum + Number(c.totalExpense || 0), 0) || 0;
    const netCash = totalSales - totalExpenses;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Cash Flow Statement</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <ArrowUpRight className="h-4 w-4 text-green-500" />
                            Cash Inflow
                        </div>
                        <p className="text-2xl font-bold text-green-600">+₹{totalSales.toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <ArrowDownRight className="h-4 w-4 text-red-500" />
                            Cash Outflow
                        </div>
                        <p className="text-2xl font-bold text-red-600">-₹{totalExpenses.toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Wallet className="h-4 w-4" />
                            Net Cash Flow
                        </div>
                        <p className="text-2xl font-bold">₹{netCash.toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <TrendingUp className="h-4 w-4" />
                            Days Recorded
                        </div>
                        <p className="text-2xl font-bold">{closures?.length || 0}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Cash Flow Details</CardTitle>
                </CardHeader>
                <CardContent>
                    {closures && closures.length > 0 ? (
                        <div className="space-y-2">
                            {closures.slice(0, 10).map((closure) => (
                                <div key={closure.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                    <div>
                                        <p className="font-medium">{new Date(closure.date).toLocaleDateString()}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Sales: ₹{Number(closure.totalSale || 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <p className={`font-bold ${Number(closure.totalSale || 0) - Number(closure.totalExpense || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                                        ₹{(Number(closure.totalSale || 0) - Number(closure.totalExpense || 0)).toLocaleString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-8">No cash flow data recorded yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

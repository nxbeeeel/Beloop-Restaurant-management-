"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, TrendingUp, Users, ShoppingCart, DollarSign, Package } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOutlet } from "@/hooks/use-outlet";

export default function AnalyticsPage() {
    const { outletId, isLoading: outletLoading } = useOutlet();

    // Use dashboard stats which works for outlet users
    const { data: dashboardData, isLoading: dataLoading } = trpc.dashboard.getOutletStats.useQuery(
        { outletId: outletId || "" },
        { enabled: !!outletId }
    );

    const isLoading = outletLoading || dataLoading;

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <Skeleton className="h-4 w-24 mb-2" />
                                <Skeleton className="h-8 w-32" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2].map((i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-40" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-64 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    const summary = dashboardData?.summary;
    const topItems = dashboardData?.topItems || [];

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            Total Revenue
                        </div>
                        <p className="text-2xl font-bold">₹{Number(summary?.totalSales || 0).toLocaleString()}</p>
                        <p className="text-xs text-green-600 mt-1">This month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <TrendingUp className="h-4 w-4 text-blue-500" />
                            Net Profit
                        </div>
                        <p className="text-2xl font-bold">₹{Number(summary?.netProfit || 0).toLocaleString()}</p>
                        <p className="text-xs text-blue-600 mt-1">{Number(summary?.profitMargin || 0).toFixed(1)}% margin</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <ShoppingCart className="h-4 w-4 text-purple-500" />
                            Total Expenses
                        </div>
                        <p className="text-2xl font-bold">₹{Number(summary?.totalExpenses || 0).toLocaleString()}</p>
                        <p className="text-xs text-purple-600 mt-1">{Number(summary?.expenseRatio || 0).toFixed(1)}% of revenue</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Package className="h-4 w-4 text-orange-500" />
                            Avg Ticket Size
                        </div>
                        <p className="text-2xl font-bold">₹{Number(summary?.avgTicketSize || 0).toLocaleString()}</p>
                        <p className="text-xs text-orange-600 mt-1">Per order</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Sales Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
                            <div className="text-center text-muted-foreground">
                                <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                <p>Sales chart visualization</p>
                                <p className="text-xs">Coming soon</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Top Products</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {topItems.length > 0 ? (
                            <div className="space-y-3">
                                {topItems.slice(0, 5).map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                                {idx + 1}
                                            </span>
                                            <span className="font-medium">{item.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold">{item.quantity} sold</p>
                                            <p className="text-xs text-muted-foreground">₹{Number(item.revenue || 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
                                <div className="text-center text-muted-foreground">
                                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                    <p>No sales data yet</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

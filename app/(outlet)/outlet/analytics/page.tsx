"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, TrendingUp, Users, ShoppingCart, DollarSign, Package } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function AnalyticsPage() {
    const { data: dashboardData, isLoading } = trpc.analytics.getBrandOverview.useQuery({});

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
                        <p className="text-2xl font-bold">₹{(dashboardData?.totalRevenue || 0).toLocaleString()}</p>
                        <p className="text-xs text-green-600 mt-1">This month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <ShoppingCart className="h-4 w-4 text-blue-500" />
                            Total Orders
                        </div>
                        <p className="text-2xl font-bold">{dashboardData?.totalOrders || 0}</p>
                        <p className="text-xs text-blue-600 mt-1">This month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Users className="h-4 w-4 text-purple-500" />
                            Active Outlets
                        </div>
                        <p className="text-2xl font-bold">{dashboardData?.activeOutlets || 0}</p>
                        <p className="text-xs text-purple-600 mt-1">Total locations</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Package className="h-4 w-4 text-orange-500" />
                            Avg Order Value
                        </div>
                        <p className="text-2xl font-bold">₹{(dashboardData?.avgOrderValue || 0).toLocaleString()}</p>
                        <p className="text-xs text-orange-600 mt-1">This month</p>
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
                        <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
                            <div className="text-center text-muted-foreground">
                                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                <p>Product performance chart</p>
                                <p className="text-xs">Coming soon</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

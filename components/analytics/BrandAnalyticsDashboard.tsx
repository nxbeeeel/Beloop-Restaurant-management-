"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { KPICard } from "./KPICard";
import { OutletComparisonTable } from "./OutletComparisonTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, DollarSign, TrendingUp, AlertCircle, PieChart, TrendingDown, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animations";
import { cn } from "@/lib/utils";

// ... (imports)

export function BrandAnalyticsDashboard() {
    const [selectedOutletId, setSelectedOutletId] = useState<string>("all");

    const { data: outlets } = trpc.outlets.list.useQuery();
    const { data, isLoading, error } = trpc.analytics.getBrandOverview.useQuery({
        outletId: selectedOutletId === "all" ? undefined : selectedOutletId
    });

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    if (error) {
        return <div className="text-red-500">Error loading analytics: {error.message}</div>;
    }

    if (!data) return null;

    const { kpis, lossMakingOutlets, topOutlets, highExpenseOutlets, outletPerformance, meta } = data;

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    const glassCardClass = "border-none shadow-sm bg-white/60 backdrop-blur-xl ring-1 ring-gray-200/50";

    return (
        <FadeIn className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Strategic Analytics</h2>
                    <p className="text-muted-foreground">
                        Financial performance and operational insights. Data updated: {new Date(meta.lastRefreshed).toLocaleString()}
                    </p>
                </div>
                <div className="w-[200px]">
                    <Select value={selectedOutletId} onValueChange={setSelectedOutletId}>
                        <SelectTrigger className="bg-white/50 backdrop-blur-sm border-gray-200">
                            <SelectValue placeholder="Select Outlet" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Outlets</SelectItem>
                            {outlets?.map((outlet) => (
                                <SelectItem key={outlet.id} value={outlet.id}>
                                    {outlet.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KPICard
                    title="Net Profit Margin"
                    value={`${kpis.netProfitMargin.toFixed(1)}%`}
                    subValue={`Net Profit: ${formatCurrency(kpis.netProfit)}`}
                    icon={<TrendingUp />}
                    status={kpis.netProfitMargin > 15 ? "success" : kpis.netProfitMargin > 0 ? "warning" : "danger"}
                    delay={0}
                />
                <KPICard
                    title="Total Revenue"
                    value={formatCurrency(kpis.totalSales)}
                    icon={<DollarSign />}
                    status="neutral"
                    delay={0.1}
                />
                <KPICard
                    title="Wastage Cost"
                    value={`${kpis.wastageRatio.toFixed(1)}%`}
                    subValue={`Cost: ${formatCurrency(kpis.totalWastage)}`}
                    icon={<AlertCircle />}
                    status={kpis.wastageRatio < 2 ? "success" : kpis.wastageRatio < 5 ? "warning" : "danger"}
                    delay={0.2}
                />
                <KPICard
                    title="Gross Profit Margin"
                    value={`${kpis.grossProfitMargin.toFixed(1)}%`}
                    icon={<PieChart />}
                    status="neutral"
                    delay={0.3}
                />
            </div>

            {/* Comparative Analysis Section */}
            {selectedOutletId === "all" && (
                <StaggerContainer className="grid gap-4 md:grid-cols-3" staggerDelay={0.1}>
                    {/* Profitable Shops */}
                    <StaggerItem>
                        <Card className={cn(glassCardClass, "bg-green-50/30 ring-green-100")}>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center text-green-700 text-lg">
                                    <TrendingUp className="h-5 w-5 mr-2" />
                                    Top Performers
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {topOutlets.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No data available.</p>
                                    ) : (
                                        topOutlets.map((outlet: any) => (
                                            <div key={outlet.id} className="flex items-center justify-between bg-white/80 p-3 rounded border border-green-100 shadow-sm backdrop-blur-sm">
                                                <div>
                                                    <div className="font-medium text-gray-900">{outlet.name}</div>
                                                    <div className="text-xs text-gray-500">Margin: {outlet.margin.toFixed(1)}%</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-green-600">{formatCurrency(outlet.netProfit)}</div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </StaggerItem>

                    {/* Loss Making Shops */}
                    <StaggerItem>
                        <Card className={cn(glassCardClass, "bg-red-50/30 ring-red-100")}>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center text-red-700 text-lg">
                                    <TrendingDown className="h-5 w-5 mr-2" />
                                    Loss Making
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {lossMakingOutlets.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No loss-making outlets.</p>
                                    ) : (
                                        lossMakingOutlets.map((outlet: any) => (
                                            <div key={outlet.id} className="flex items-center justify-between bg-white/80 p-3 rounded border border-red-100 shadow-sm backdrop-blur-sm">
                                                <div>
                                                    <div className="font-medium text-gray-900">{outlet.name}</div>
                                                    <div className="text-xs text-gray-500">Rev: {formatCurrency(outlet.revenue)}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-red-600">{formatCurrency(outlet.netProfit)}</div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </StaggerItem>

                    {/* High Expense Shops */}
                    <StaggerItem>
                        <Card className={cn(glassCardClass, "bg-orange-50/30 ring-orange-100")}>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center text-orange-700 text-lg">
                                    <AlertTriangle className="h-5 w-5 mr-2" />
                                    High Expenses
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {highExpenseOutlets.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No data available.</p>
                                    ) : (
                                        highExpenseOutlets.map((outlet: any) => (
                                            <div key={outlet.id} className="flex items-center justify-between bg-white/80 p-3 rounded border border-orange-100 shadow-sm backdrop-blur-sm">
                                                <div>
                                                    <div className="font-medium text-gray-900">{outlet.name}</div>
                                                    <div className="text-xs text-gray-500">Ratio: {outlet.ratio.toFixed(1)}%</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-orange-600">{formatCurrency(outlet.expenses)}</div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </StaggerItem>
                </StaggerContainer>
            )}

            <Tabs defaultValue="performance" className="space-y-4">
                <TabsList className="bg-white/50 backdrop-blur-sm border border-gray-200/50">
                    <TabsTrigger value="performance">Outlet Performance</TabsTrigger>
                    <TabsTrigger value="trends" disabled>Trends (Coming Soon)</TabsTrigger>
                </TabsList>

                <TabsContent value="performance" className="space-y-4">
                    <Card className={glassCardClass}>
                        <CardHeader>
                            <CardTitle>Outlet Comparison</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <OutletComparisonTable data={outletPerformance} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </FadeIn>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <Skeleton className="h-8 w-[200px]" />
                <Skeleton className="h-4 w-[300px]" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-[120px] rounded-xl" />
                ))}
            </div>
            <Skeleton className="h-[400px] rounded-xl" />
        </div>
    );
}

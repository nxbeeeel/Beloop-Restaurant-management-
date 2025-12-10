'use client';

import { toast } from "sonner";
import { Suspense } from 'react';
import { trpc } from "@/lib/trpc";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import {
    TrendingUp,
    Users,
    Building2,
    CreditCard,
    Activity,
    ArrowUpRight,
    RefreshCw,
    AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RevenueChart } from "@/components/admin/RevenueChart";

export default function SuperDashboardPage() {
    return (
        <ErrorBoundary>
            <DashboardContent />
        </ErrorBoundary>
    );
}

function DashboardContent() {
    const utils = trpc.useContext();
    const { data: stats, isLoading: statsLoading, isError: statsError, error: statsErrorDetails } = trpc.superAnalytics.getPlatformStats.useQuery();
    const { data: revenueTrend, isLoading: trendsLoading, isError: trendsError } = trpc.superAnalytics.getRevenueTrend.useQuery({ days: 30 });
    const { data: activities, isLoading: activitiesLoading, isError: activitiesError } = trpc.superAnalytics.getRecentActivity.useQuery({ limit: 5 });

    const isLoading = statsLoading || trendsLoading || activitiesLoading;
    const isError = statsError || trendsError || activitiesError;

    // Premium Skeleton Loader
    if (isLoading) {
        return (
            <div className="space-y-8 animate-pulse">
                {/* Header Skeleton */}
                <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-2">
                        <div className="h-8 w-48 bg-stone-800 rounded-lg"></div>
                        <div className="h-4 w-64 bg-stone-800/60 rounded"></div>
                    </div>
                </div>
                {/* KPI Grid Skeleton */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-32 bg-stone-800 rounded-xl border border-stone-800/50"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        console.error("Dashboard Data Error:", statsErrorDetails);
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 bg-red-50/50 rounded-2xl border border-red-100 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-xl font-bold text-red-900 mb-2">Failed to load dashboard data</h3>
                <p className="text-red-600 mb-6 max-w-md">
                    We couldn't fetch the latest analytics. This might be a temporary server issue.
                </p>
                {statsErrorDetails && (
                    <div className="bg-white p-3 rounded border border-red-200 text-xs font-mono text-red-800 mb-6 w-full max-w-lg overflow-auto">
                        {statsErrorDetails.message}
                    </div>
                )}
                <Button
                    variant="outline"
                    className="border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => {
                        utils.superAnalytics.getPlatformStats.invalidate();
                        utils.superAnalytics.getRevenueTrend.invalidate();
                        utils.superAnalytics.getRecentActivity.invalidate();
                    }}
                >
                    Try Again
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Dashboard</h2>
                    <p className="text-stone-400">Overview of platform performance and health.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                        utils.superAnalytics.getPlatformStats.invalidate();
                        utils.superAnalytics.getRevenueTrend.invalidate();
                        utils.superAnalytics.getRecentActivity.invalidate();
                        toast.success("Refreshed data");
                    }}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh Data
                    </Button>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                    title="Total Revenue"
                    value={`₹${stats?.totalRevenue.toLocaleString() ?? '0'}`}
                    trend="+12.5%"
                    icon={CreditCard}
                    color="text-emerald-600"
                />
                <KpiCard
                    title="Active Tenants"
                    value={stats?.activeTenants.toString() ?? '0'}
                    subValue={`/ ${stats?.totalTenants ?? 0} total`}
                    trend="+2 new"
                    icon={Building2}
                    color="text-blue-600"
                />
                <KpiCard
                    title="Total Users"
                    value={stats?.totalUsers.toString() ?? '0'}
                    trend="+5.2%"
                    icon={Users}
                    color="text-violet-600"
                />
                <KpiCard
                    title="Platform Health"
                    value="99.9%"
                    trend="Stable"
                    icon={Activity}
                    color="text-rose-600"
                />
            </div>

            {/* Main Content Split */}
            <div className="grid gap-4 md:grid-cols-7">

                {/* Chart Section (Bigger) */}
                <Card className="col-span-4 bg-white dark:bg-stone-900/50 backdrop-blur-sm border-stone-200 dark:border-stone-800 shadow-sm">
                    <CardHeader>
                        <CardTitle>Revenue Overview</CardTitle>
                        <CardDescription>Platform-wide revenue performance over last 30 days.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[350px] w-full">
                            <RevenueChart data={revenueTrend || []} title="" description="" />
                        </div>
                    </CardContent>
                </Card>

                {/* Activity Feed (Smaller) */}
                <Card className="col-span-3 bg-white dark:bg-stone-900/50 backdrop-blur-sm border-stone-200 dark:border-stone-800 shadow-sm">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Latest actions across the platform.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {activities?.map((activity, i) => (
                                <div key={i} className="flex items-center">
                                    <div className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center border border-stone-200 dark:border-stone-700">
                                        <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
                                            {activity.type === 'TENANT_CREATED' ? 'T' : 'U'}
                                        </span>
                                    </div>
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium leading-none text-stone-900 dark:text-stone-100">
                                            {activity.description}
                                        </p>
                                        <p className="text-xs text-stone-500">
                                            {new Date(activity.timestamp).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="ml-auto font-medium text-xs text-stone-500">
                                        Just now
                                    </div>
                                </div>
                            )) ?? (
                                    <p className="text-sm text-stone-500">No recent activity.</p>
                                )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}

function KpiCard({ title, value, subValue, trend, icon: Icon, color }: any) {
    return (
        <Card className="bg-white dark:bg-stone-900/50 backdrop-blur-sm border-stone-200 dark:border-stone-800 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-stone-500 dark:text-stone-400">
                    {title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-stone-900 dark:text-white">
                    {value} <span className="text-sm font-normal text-stone-400">{subValue}</span>
                </div>
                <p className="text-xs text-stone-500 mt-1 flex items-center">
                    {trend.includes('+') ? (
                        <TrendingUp className="w-3 h-3 text-emerald-500 mr-1" />
                    ) : (
                        <ArrowUpRight className="w-3 h-3 text-stone-400 mr-1" />
                    )}
                    <span className={trend.includes('+') ? "text-emerald-600 font-medium" : "text-stone-500"}>
                        {trend}
                    </span>
                </p>
            </CardContent>
        </Card>
    )
}

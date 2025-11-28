'use client';

import { trpc } from "@/lib/trpc";
import { StatCard } from "@/components/admin/StatCard";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { TenantHealthTable } from "@/components/admin/TenantHealthTable";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { Building, Users, DollarSign, TrendingUp, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SuperDashboardPage() {
    const { data: stats, isLoading: statsLoading } = trpc.superAnalytics.getPlatformStats.useQuery();
    const { data: revenueTrend, isLoading: trendLoading } = trpc.superAnalytics.getRevenueTrend.useQuery({ days: 30 });
    const { data: tenantHealth, isLoading: healthLoading } = trpc.superAnalytics.getTenantHealth.useQuery();
    const { data: activities, isLoading: activityLoading } = trpc.superAnalytics.getRecentActivity.useQuery({ limit: 10 });

    if (statsLoading || trendLoading || healthLoading || activityLoading) {
        return (
            <div className="p-8 space-y-8">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-32 w-full" />
                    ))}
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <Skeleton className="col-span-4 h-[400px]" />
                    <Skeleton className="col-span-3 h-[400px]" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-8 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <div className="flex items-center space-x-2">
                    {/* DateRangePicker could go here */}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Revenue"
                    value={`₹${stats?.totalRevenue.toLocaleString()}`}
                    icon={<DollarSign className="h-4 w-4" />}
                    trend={12.5} // TODO: Calculate actual trend
                    trendLabel="from last month"
                />
                <StatCard
                    title="Active Tenants"
                    value={stats?.activeTenants || 0}
                    description={`${stats?.totalTenants} total tenants`}
                    icon={<Building className="h-4 w-4" />}
                    trend={stats?.growthRate}
                    trendLabel="growth rate"
                />
                <StatCard
                    title="Total Users"
                    value={stats?.totalUsers || 0}
                    icon={<Users className="h-4 w-4" />}
                    description="Across all platforms"
                />
                <StatCard
                    title="Total Sales"
                    value={stats?.totalSales || 0}
                    icon={<Activity className="h-4 w-4" />}
                    description="Lifetime transactions"
                />
            </div>

            {/* Charts & Tables */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <RevenueChart
                    data={revenueTrend || []}
                    title="Revenue Overview"
                    description="Daily revenue across all tenants for the last 30 days"
                />
                <ActivityFeed activities={activities || []} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <TenantHealthTable tenants={tenantHealth || []} />
                {/* Could add another widget here, e.g., Top Performing Tenants */}
            </div>
        </div>
    );
}

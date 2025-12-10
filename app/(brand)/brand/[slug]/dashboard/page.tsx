'use client';

import { trpc } from '@/lib/trpc';
import { KPICard } from '@/components/brand/KPICard';
import { OutletPerformanceTable } from '@/components/brand/OutletPerformanceTable';
import { Store, Users, CreditCard } from 'lucide-react';

export default function BrandDashboard() {
    // Fetch brand overview data with React Query caching
    const { data: overview, isLoading: overviewLoading } = trpc.brandAnalytics.getBrandOverview.useQuery(
        undefined,
        {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes
            refetchOnWindowFocus: false,
        }
    );

    // Fetch outlet performance data
    const { data: outlets, isLoading: outletsLoading } = trpc.brandAnalytics.getOutletPerformance.useQuery(
        undefined,
        {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
        }
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Brand Dashboard
                    </h2>
                    <p className="text-muted-foreground">
                        Overview of your brand&apos;s performance across all outlets.
                    </p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <KPICard
                    title="Active Outlets"
                    value={overview?.activeOutlets || 0}
                    icon={Store}
                    loading={overviewLoading}
                    description="Fully operational"
                    trend="neutral"
                />
                <KPICard
                    title="Total Staff"
                    value={overview?.totalStaff || 0}
                    icon={Users}
                    loading={overviewLoading}
                    description="Across all locations"
                    trend="neutral"
                />
                <KPICard
                    title="Total Revenue"
                    value={overview?.totalRevenue ? `₹${overview.totalRevenue.toFixed(2)}` : '₹0.00'}
                    icon={CreditCard}
                    loading={overviewLoading}
                    description="Last 30 days"
                    change={overview?.revenueChange}
                    trend={overview?.revenueChange && overview.revenueChange > 0 ? 'up' : overview?.revenueChange && overview.revenueChange < 0 ? 'down' : 'neutral'}
                />
            </div>

            {/* Outlet Performance Table */}
            <OutletPerformanceTable
                outlets={outlets || []}
                loading={outletsLoading}
            />
        </div>
    );
}

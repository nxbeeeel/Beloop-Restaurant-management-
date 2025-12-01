"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";
import { Download, TrendingUp, ShoppingBag, Users, CreditCard, Loader2 } from "lucide-react";

export default function ReportsPage() {
    const [range, setRange] = useState("thisMonth");

    const getDateRange = () => {
        const now = new Date();
        switch (range) {
            case "today":
                return { startDate: startOfDay(now), endDate: endOfDay(now) };
            case "yesterday":
                const yest = subDays(now, 1);
                return { startDate: startOfDay(yest), endDate: endOfDay(yest) };
            case "last7":
                return { startDate: subDays(now, 7), endDate: now };
            case "thisMonth":
                return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
            case "lastMonth":
                const lastMonth = subMonths(now, 1);
                return { startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth) };
            default:
                return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
        }
    };

    const { startDate, endDate } = getDateRange();
    const queryInput = { startDate, endDate };

    const { data: stats, isLoading: statsLoading } = trpc.reports.getStats.useQuery(queryInput);
    const { data: trend, isLoading: trendLoading } = trpc.reports.getSalesTrend.useQuery(queryInput);
    const { data: topItems, isLoading: itemsLoading } = trpc.reports.getTopItems.useQuery({ ...queryInput, limit: 5 });
    const { data: paymentMethods, isLoading: paymentsLoading } = trpc.reports.getPaymentMethods.useQuery(queryInput);

    const isLoading = statsLoading || trendLoading || itemsLoading || paymentsLoading;

    return (
        <div className="space-y-6 pb-24 lg:pb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">Reports & Analytics</h1>
                    <p className="text-gray-500 text-sm lg:text-base">Track performance and insights.</p>
                </div>
                <div className="flex gap-2">
                    <Select value={range} onValueChange={setRange}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="yesterday">Yesterday</SelectItem>
                            <SelectItem value="last7">Last 7 Days</SelectItem>
                            <SelectItem value="thisMonth">This Month</SelectItem>
                            <SelectItem value="lastMonth">Last Month</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" className="gap-2">
                        <Download className="w-4 h-4" /> Export
                    </Button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Sales</p>
                            <p className="text-2xl font-bold">₹{stats?.sales.toLocaleString() || 0}</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-full">
                            <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Orders</p>
                            <p className="text-2xl font-bold">{stats?.orders || 0}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-full">
                            <ShoppingBag className="w-6 h-6 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Customers</p>
                            <p className="text-2xl font-bold">{stats?.customers || 0}</p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-full">
                            <Users className="w-6 h-6 text-purple-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Avg Order Value</p>
                            <p className="text-2xl font-bold">₹{Math.round(stats?.avgOrderValue || 0)}</p>
                        </div>
                        <div className="p-3 bg-orange-100 rounded-full">
                            <CreditCard className="w-6 h-6 text-orange-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Sales Trend */}
                    <Card className="col-span-1 lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Sales Trend</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full bg-gray-50 rounded-lg flex items-center justify-center border border-dashed">
                                {/* Placeholder for Chart - Recharts would be ideal but keeping it simple/safe without checking deps */}
                                <div className="text-center text-gray-400">
                                    <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>Sales Trend Visualization</p>
                                    <div className="mt-4 flex gap-4 overflow-x-auto max-w-full px-4">
                                        {trend?.slice(-7).map((t) => (
                                            <div key={t.date} className="flex flex-col items-center">
                                                <div className="h-24 w-8 bg-primary/20 rounded-t relative group">
                                                    <div
                                                        className="absolute bottom-0 w-full bg-primary rounded-t transition-all"
                                                        style={{ height: `${Math.min((t.amount / (Math.max(...(trend?.map(x => x.amount) || [1])))) * 100, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs mt-1 text-gray-500">{format(new Date(t.date), 'dd/MM')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top Items */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Menu Items</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {topItems?.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-sm text-gray-600">
                                                {i + 1}
                                            </div>
                                            <div>
                                                <p className="font-medium">{item.name}</p>
                                                <p className="text-xs text-gray-500">{item.orders} orders</p>
                                            </div>
                                        </div>
                                        <p className="font-medium">₹{item.revenue.toLocaleString()}</p>
                                    </div>
                                ))}
                                {topItems?.length === 0 && <p className="text-gray-500 text-center py-4">No data available</p>}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment Methods */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Payment Methods</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {paymentMethods?.map((method, i) => (
                                    <div key={i} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium">{method.method}</span>
                                            <span className="text-gray-500">₹{method.amount.toLocaleString()} ({method.percentage}%)</span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary"
                                                style={{ width: `${method.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {paymentMethods?.length === 0 && <p className="text-gray-500 text-center py-4">No data available</p>}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

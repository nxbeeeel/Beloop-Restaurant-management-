/* eslint-disable react/forbid-dom-props */
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";
import { Download, TrendingUp, ShoppingBag, Users, CreditCard, Loader2, Calendar } from "lucide-react";

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
                        <SelectTrigger className="w-[180px] bg-white">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
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
                    <Button variant="outline" className="gap-2 bg-white hover:bg-gray-50">
                        <Download className="w-4 h-4" /> Export
                    </Button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-none shadow-sm ring-1 ring-gray-100">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Sales</p>
                            <p className="text-2xl font-bold text-gray-900">₹{stats?.sales.toLocaleString() || 0}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-full">
                            <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm ring-1 ring-gray-100">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Orders</p>
                            <p className="text-2xl font-bold text-gray-900">{stats?.orders || 0}</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-full">
                            <ShoppingBag className="w-6 h-6 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm ring-1 ring-gray-100">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Customers</p>
                            <p className="text-2xl font-bold text-gray-900">{stats?.customers || 0}</p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-full">
                            <Users className="w-6 h-6 text-purple-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm ring-1 ring-gray-100">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Avg Order Value</p>
                            <p className="text-2xl font-bold text-gray-900">₹{Math.round(stats?.avgOrderValue || 0)}</p>
                        </div>
                        <div className="p-3 bg-orange-50 rounded-full">
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
                    <Card className="col-span-1 lg:col-span-2 border-none shadow-sm ring-1 ring-gray-100">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold text-gray-900">Sales Trend</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full bg-white rounded-lg flex items-end justify-between px-4 pb-4 gap-2">
                                {trend && trend.length > 0 ? (
                                    trend.slice(-14).map((t) => {
                                        const maxVal = Math.max(...(trend.map(x => x.amount) || [1]));
                                        const heightPercent = Math.max((t.amount / maxVal) * 100, 5); // Min 5% height
                                        // eslint-disable-next-line
                                        const barStyle = { '--height': `${heightPercent}%` } as React.CSSProperties;

                                        return (
                                            <div key={t.date} className="flex flex-col items-center flex-1 group relative">
                                                <div
                                                    className="w-full bg-primary/10 rounded-t hover:bg-primary/20 transition-all relative group-hover:scale-y-105 origin-bottom h-[var(--height)]"
                                                    style={barStyle}
                                                >
                                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                                        ₹{t.amount.toLocaleString()}
                                                    </div>
                                                </div>
                                                <span className="text-[10px] mt-2 text-gray-400 rotate-0 truncate w-full text-center">
                                                    {format(new Date(t.date), 'dd/MM')}
                                                </span>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        No sales data for this period
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top Items */}
                    <Card className="border-none shadow-sm ring-1 ring-gray-100">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold text-gray-900">Top Menu Items</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {topItems?.map((item: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                i === 1 ? 'bg-gray-100 text-gray-700' :
                                                    i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'
                                                }`}>
                                                {i + 1}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{item.name}</p>
                                                <p className="text-xs text-gray-500">{item.orders} orders</p>
                                            </div>
                                        </div>
                                        <p className="font-medium text-gray-900">₹{item.revenue.toLocaleString()}</p>
                                    </div>
                                ))}
                                {topItems?.length === 0 && <p className="text-gray-500 text-center py-8">No data available</p>}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment Methods */}
                    <Card className="border-none shadow-sm ring-1 ring-gray-100">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold text-gray-900">Payment Methods</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-5">
                                {paymentMethods?.map((method, i) => {
                                    // eslint-disable-next-line
                                    const barStyle = { '--width': `${method.percentage}%` } as React.CSSProperties;
                                    return (
                                        <div key={i} className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-medium text-gray-700">{method.method}</span>
                                                <span className="text-gray-900 font-semibold">₹{method.amount.toLocaleString()} <span className="text-gray-400 font-normal">({method.percentage}%)</span></span>
                                            </div>
                                            <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary rounded-full transition-all duration-500 w-[var(--width)]"
                                                    style={barStyle}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                                {paymentMethods?.length === 0 && <p className="text-gray-500 text-center py-8">No data available</p>}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, Users, ShoppingBag, CreditCard, Calendar as CalendarIcon } from 'lucide-react';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';

interface MonthlyReportViewProps {
    initialOutletId: string;
    outlets: { id: string; name: string }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function MonthlyReportView({ initialOutletId, outlets }: MonthlyReportViewProps) {
    const [outletId, setOutletId] = useState(initialOutletId);
    const [date, setDate] = useState<Date>(new Date());

    // Calculate query params
    const startDate = startOfMonth(date);
    const endDate = endOfMonth(date);
    const queryParams = {
        outletId: outletId === 'ALL' ? undefined : outletId,
        startDate,
        endDate
    };

    // Fetch Data
    const { data: stats, isLoading: statsLoading } = trpc.reports.getStats.useQuery(queryParams);
    const { data: trend, isLoading: trendLoading } = trpc.reports.getSalesTrend.useQuery(queryParams);
    const { data: topItems, isLoading: itemsLoading } = trpc.reports.getTopItems.useQuery(queryParams);
    const { data: paymentMethods, isLoading: paymentsLoading } = trpc.reports.getPaymentMethods.useQuery(queryParams);

    const isLoading = statsLoading || trendLoading || itemsLoading || paymentsLoading;

    // Formatting
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val);
    };

    return (
        <div className="space-y-8 p-6">
            {/* Header / Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Monthly Report</h1>
                    <p className="text-muted-foreground">
                        Performance overview for {format(date, 'MMMM yyyy')}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <Select value={outletId} onValueChange={setOutletId}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select Outlet" />
                        </SelectTrigger>
                        <SelectContent>
                            {outlets.length > 1 && <SelectItem value="ALL">All Outlets</SelectItem>}
                            {outlets.map(o => (
                                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2 border rounded-md p-1 bg-card">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDate(subMonths(date, 1))}
                        >
                            ←
                        </Button>
                        <span className="min-w-[120px] text-center font-medium">
                            {format(date, 'MMM yyyy')}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={date >= new Date()}
                            onClick={() => setDate(subMonths(date, -1))}
                        >
                            →
                        </Button>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="h-[400px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(stats?.sales || 0)}</div>
                                <p className="text-xs text-muted-foreground">
                                    {stats?.orders} total orders
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(stats?.avgOrderValue || 0)}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Unique Customers</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats?.customers || 0}</div>
                            </CardContent>
                        </Card>
                        {/* 
                         TODO: Add Expenses/Profit here if/when expense data is linked properly 
                         For now we can show Payment Methods count or just leave it at 3 cards
                        */}
                    </div>

                    {/* Charts Section */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        {/* Sales Trend */}
                        <Card className="col-span-4">
                            <CardHeader>
                                <CardTitle>Sales Trend</CardTitle>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={trend}>
                                            <defs>
                                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis
                                                dataKey="date"
                                                tickFormatter={(str) => format(new Date(str), 'd MMM')}
                                                minTickGap={30}
                                            />
                                            <YAxis removeFirst /> // Simplified Y-axis
                                            <Tooltip
                                                labelFormatter={(label) => format(new Date(label), 'PPP')}
                                                formatter={(value) => [formatCurrency(Number(value)), 'Sales']}
                                            />
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <Area
                                                type="monotone"
                                                dataKey="amount"
                                                stroke="#8884d8"
                                                fillOpacity={1}
                                                fill="url(#colorSales)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Payment Methods */}
                        <Card className="col-span-3">
                            <CardHeader>
                                <CardTitle>Payment Methods</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px] flex flex-col items-center justify-center">
                                    {(paymentMethods && paymentMethods.length > 0) ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={paymentMethods}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="amount"
                                                >
                                                    {paymentMethods.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(val) => formatCurrency(Number(val))} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="text-muted-foreground flex flex-col items-center">
                                            <CreditCard className="h-8 w-8 mb-2 opacity-50" />
                                            No payment data available
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Top Items Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Selling Items</CardTitle>
                            <CardDescription>
                                Best performing products by revenue for this period.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {topItems?.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                        <div className="space-y-1">
                                            <p className="font-medium">{item.name}</p>
                                            <p className="text-xs text-muted-foreground">{item.orders} orders</p>
                                        </div>
                                        <div className="font-bold">
                                            {formatCurrency(item.revenue)}
                                        </div>
                                    </div>
                                ))}
                                {(!topItems || topItems.length === 0) && (
                                    <div className="text-center py-4 text-muted-foreground">
                                        No sales data found.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}

"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { useOutlet } from "@/hooks/use-outlet";

export default function DashboardPage() {
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    const { outletId, isLoading: userLoading, user } = useOutlet();

    // Calculate date range for selected month
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const { data: sales, isLoading: salesLoading } = trpc.sales.list.useQuery(
        { outletId: outletId || "", startDate, endDate },
        { enabled: !!outletId }
    );

    const { data: expenses, isLoading: expensesLoading } = trpc.expenses.list.useQuery(
        { outletId: outletId || "", startDate, endDate },
        { enabled: !!outletId }
    );

    const handlePreviousMonth = () => {
        const date = new Date(year, month - 1, 1);
        date.setMonth(date.getMonth() - 1);
        setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    };

    const handleNextMonth = () => {
        const date = new Date(year, month - 1, 1);
        date.setMonth(date.getMonth() + 1);
        setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    };

    const getMonthDisplay = () => {
        return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    // Calculate summary
    const totalSales = sales?.reduce((sum, s) => sum + Number(s.totalSale), 0) || 0;
    const cashSales = sales?.reduce((sum, s) => sum + Number(s.cashSale), 0) || 0;
    const bankSales = sales?.reduce((sum, s) => sum + Number(s.bankSale), 0) || 0;
    const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
    const profit = totalSales - totalExpenses;
    const profitMargin = totalSales > 0 ? ((profit / totalSales) * 100).toFixed(1) : '0.0';
    const expenseRatio = totalSales > 0 ? ((totalExpenses / totalSales) * 100).toFixed(1) : '0.0';

    const formatCurrency = (amount: number) => {
        return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const loading = userLoading || salesLoading || expensesLoading;

    if (userLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!outletId) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">No outlet assigned</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-10 max-w-5xl mx-auto">
            {/* Header */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-xl sm:text-2xl">📊 Dashboard</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Monthly sales and expense summary</CardDescription>
                </CardHeader>
            </Card>

            {/* Month Navigator */}
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        {/* Month Navigation */}
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handlePreviousMonth}
                                variant="outline"
                                className="h-14 px-4"
                                disabled={loading}
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </Button>

                            <div className="flex-1 text-center relative">
                                <div className="text-lg sm:text-xl font-bold mb-2">
                                    {getMonthDisplay()}
                                </div>
                                <div className="relative">
                                    <input
                                        type="month"
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="w-full px-4 py-3 border rounded-xl bg-white text-base text-center shadow-sm cursor-pointer"
                                    />
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                </div>
                            </div>

                            <Button
                                onClick={handleNextMonth}
                                variant="outline"
                                className="h-14 px-4"
                                disabled={loading}
                            >
                                <ChevronRight className="h-6 w-6" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {loading && (
                <div className="text-center py-8">
                    <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-2 text-sm text-muted-foreground">Loading data...</p>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Total Sales Card */}
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                            Total Sales
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl sm:text-3xl font-bold text-green-600">
                            {formatCurrency(totalSales)}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 mt-2">For selected month</p>
                    </CardContent>
                </Card>

                {/* Total Expenses Card */}
                <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                            <TrendingDown className="h-5 w-5 text-red-600" />
                            Total Expenses
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl sm:text-3xl font-bold text-red-600">
                            {formatCurrency(totalExpenses)}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 mt-2">All expenses combined</p>
                    </CardContent>
                </Card>

                {/* Net Profit Card - Full Width */}
                <Card className={`sm:col-span-2 bg-gradient-to-br ${profit >= 0 ? 'from-blue-50 to-cyan-50 border-blue-200' : 'from-red-50 to-pink-50 border-red-200'
                    }`}>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                            <DollarSign className={`h-5 w-5 ${profit >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
                            Net Profit
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-3xl sm:text-4xl font-bold ${profit >= 0 ? 'text-blue-600' : 'text-red-600'
                            }`}>
                            {formatCurrency(profit)}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 mt-2">
                            Sales - Expenses = Profit
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Stats */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-sm text-gray-600">Cash Sales</span>
                            <span className="font-semibold text-base">{formatCurrency(cashSales)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-sm text-gray-600">Bank Sales</span>
                            <span className="font-semibold text-base">{formatCurrency(bankSales)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-sm text-gray-600">Expense Ratio</span>
                            <span className="font-semibold text-base text-red-600">{expenseRatio}%</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-gray-600">Profit Margin</span>
                            <span className={`font-semibold text-base ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {profitMargin}%
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Sync Health Card */}
            <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <div className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span>
                        </div>
                        POS Sync Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Last Sync</span>
                            <span className="font-bold text-violet-700">
                                {user?.outlet?.lastSyncAt
                                    ? new Date(user.outlet.lastSyncAt).toLocaleTimeString()
                                    : 'Never'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Status</span>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${user?.outlet?.lastSyncAt && (new Date().getTime() - new Date(user.outlet.lastSyncAt).getTime() < 60000)
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                {user?.outlet?.lastSyncAt && (new Date().getTime() - new Date(user.outlet.lastSyncAt).getTime() < 60000)
                                    ? 'Online'
                                    : 'Idle / Offline'}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Sales Breakdown */}
            {sales && sales.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base sm:text-lg">Recent Sales</CardTitle>
                        <CardDescription className="text-xs">Last 5 entries</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {sales.slice(0, 5).map((sale) => (
                                <div key={sale.id} className="flex justify-between items-center py-2 border-b last:border-0">
                                    <span className="text-sm font-medium">
                                        {new Date(sale.date).toLocaleDateString('en-IN', {
                                            day: '2-digit',
                                            month: 'short'
                                        })}
                                    </span>
                                    <span className="font-bold text-green-600">
                                        {formatCurrency(Number(sale.totalSale))}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

"use client";

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, IndianRupee, Package, AlertTriangle, ShoppingBag, ArrowRight } from "lucide-react";
import { useOutlet } from "@/hooks/use-outlet";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
    const { outletId, isLoading: userLoading, user } = useOutlet();

    const { data: stats, isLoading: statsLoading } = trpc.dashboard.getOutletStats.useQuery(
        { outletId: outletId || "" },
        { enabled: !!outletId }
    );

    const loading = userLoading || statsLoading;

    if (loading) {
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

    const summary = stats?.summary;
    const topItems = stats?.topItems || [];
    const alerts = stats?.alerts || { lowStockProducts: 0, lowStockIngredients: 0 };
    const recentSales = stats?.recentSales || [];

    const formatCurrency = (amount: number | string | undefined) => {
        return `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="space-y-8 pb-10 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
                    <p className="text-gray-500 text-sm">Overview for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/outlet/reports">View Full Reports</Link>
                    </Button>
                    <Button className="bg-primary hover:bg-primary/90 text-white" asChild>
                        <Link href="/outlet/inventory">Manage Stock</Link>
                    </Button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-none shadow-sm bg-white ring-1 ring-gray-100">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.totalSales)}</div>
                        <p className="text-xs text-gray-500 mt-1">
                            {summary?.daysWithSales || 0} active days this month
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white ring-1 ring-gray-100">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-gray-500">Net Profit</p>
                            <IndianRupee className={`h-4 w-4 ${Number(summary?.netProfit) >= 0 ? 'text-blue-500' : 'text-red-500'}`} />
                        </div>
                        <div className={`text-2xl font-bold ${Number(summary?.netProfit) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {formatCurrency(summary?.netProfit)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {Number(summary?.profitMargin).toFixed(1)}% margin
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white ring-1 ring-gray-100">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-gray-500">Total Expenses</p>
                            <TrendingDown className="h-4 w-4 text-red-500" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.totalExpenses)}</div>
                        <p className="text-xs text-gray-500 mt-1">
                            {Number(summary?.expenseRatio).toFixed(1)}% of revenue
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white ring-1 ring-gray-100">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-gray-500">Avg Ticket Size</p>
                            <ShoppingBag className="h-4 w-4 text-purple-500" />
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{formatCurrency(summary?.avgTicketSize)}</div>
                        <p className="text-xs text-gray-500 mt-1">
                            Per completed order
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area (2 cols) */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Recent Sales */}
                    <Card className="border-gray-200 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">Recent Activity</CardTitle>
                                <CardDescription>Latest transactions from POS</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/outlet/reports">View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recentSales.map((sale: any) => (
                                    <div key={sale.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center border text-gray-500">
                                                <ShoppingBag size={18} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">Sale #{sale.id.slice(-4)}</p>
                                                <p className="text-xs text-gray-500">{new Date(sale.date).toLocaleDateString()} • {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-gray-900">{formatCurrency(Number(sale.totalSale))}</p>
                                            <p className="text-xs text-gray-500">{sale.paymentMethod || 'CASH'}</p>
                                        </div>
                                    </div>
                                ))}
                                {recentSales.length === 0 && (
                                    <div className="text-center py-8 text-gray-500">No recent sales found.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top Items */}
                    <Card className="border-gray-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Top Selling Items</CardTitle>
                            <CardDescription>Best performers this month</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {topItems.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                {idx + 1}
                                            </div>
                                            <span className="font-medium text-gray-700">{item.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="block font-bold text-gray-900">{item.quantity} sold</span>
                                            <span className="text-xs text-gray-500">{formatCurrency(item.revenue)} revenue</span>
                                        </div>
                                    </div>
                                ))}
                                {topItems.length === 0 && (
                                    <div className="text-center py-8 text-gray-500">No sales data available yet.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Area (1 col) */}
                <div className="space-y-8">
                    {/* Alerts Widget */}
                    <Card className="border-gray-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                Action Needed
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium text-yellow-800">Low Stock Products</span>
                                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{alerts.lowStockProducts}</Badge>
                                </div>
                                <p className="text-xs text-yellow-700 mb-3">Products below minimum stock level.</p>
                                <Button variant="outline" size="sm" className="w-full border-yellow-200 text-yellow-800 hover:bg-yellow-100" asChild>
                                    <Link href="/outlet/inventory?tab=products">Restock Products</Link>
                                </Button>
                            </div>

                            <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium text-red-800">Low Ingredients</span>
                                    <Badge variant="secondary" className="bg-red-100 text-red-800">{alerts.lowStockIngredients}</Badge>
                                </div>
                                <p className="text-xs text-red-700 mb-3">Raw materials running low.</p>
                                <Button variant="outline" size="sm" className="w-full border-red-200 text-red-800 hover:bg-red-100" asChild>
                                    <Link href="/outlet/inventory?tab=ingredients">Order Ingredients</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card className="border-gray-200 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button variant="outline" className="w-full justify-start" asChild>
                                <Link href="/outlet/menu">
                                    <Package className="mr-2 h-4 w-4" /> Add Menu Item
                                </Link>
                            </Button>
                            <Button variant="outline" className="w-full justify-start" asChild>
                                <Link href="/outlet/inventory">
                                    <ShoppingBag className="mr-2 h-4 w-4" /> Update Stock
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOutlet } from "@/hooks/use-outlet";

export default function ProfitLossPage() {
    const { outletId, isLoading: outletLoading } = useOutlet();
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const { data: closures, isLoading: closuresLoading } = trpc.dailyClosure.list.useQuery(
        { outletId: outletId || "" },
        { enabled: !!outletId }
    );

    const { data: expenseData, isLoading: expenseLoading } = trpc.expensesV2.getSummaryByCategory.useQuery(
        {
            startDate: startOfMonth.toISOString().split('T')[0],
            endDate: today.toISOString().split('T')[0],
        },
        { enabled: !!outletId }
    );

    const isLoading = outletLoading || closuresLoading || expenseLoading;

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                                <Skeleton className="h-6 w-32" />
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {[1, 2, 3, 4].map((j) => (
                                        <Skeleton key={j} className="h-10 w-full" />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    const totalRevenue = closures?.reduce((sum, c) => sum + Number(c.totalSale || 0), 0) || 0;
    const totalExpenses = expenseData?.grandTotal || 0;
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0";

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold">Profit & Loss Statement</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            Total Revenue
                        </div>
                        <p className="text-2xl font-bold text-green-600">₹{totalRevenue.toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <TrendingDown className="h-4 w-4 text-red-500" />
                            Total Expenses
                        </div>
                        <p className="text-2xl font-bold text-red-600">₹{totalExpenses.toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card className={netProfit >= 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <DollarSign className="h-4 w-4" />
                            Net Profit
                        </div>
                        <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {netProfit >= 0 ? "+" : ""}₹{netProfit.toLocaleString()}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Percent className="h-4 w-4" />
                            Profit Margin
                        </div>
                        <p className={`text-2xl font-bold ${Number(profitMargin) >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {profitMargin}%
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-green-600">Revenue Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {closures && closures.length > 0 ? (
                            <div className="space-y-3">
                                {closures.slice(0, 5).map((closure) => (
                                    <div key={closure.id} className="flex justify-between p-3 bg-green-50 rounded-lg">
                                        <span>{new Date(closure.date).toLocaleDateString()}</span>
                                        <span className="font-bold">₹{Number(closure.totalSale || 0).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-center py-4">No revenue recorded</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-red-600">Expense Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {expenseData?.categories && expenseData.categories.length > 0 ? (
                            <div className="space-y-3">
                                {expenseData.categories.map((cat) => (
                                    <div key={cat.id} className="flex justify-between p-3 bg-red-50 rounded-lg">
                                        <span>{cat.name}</span>
                                        <span className="font-bold">₹{cat.total.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-center py-4">No expenses recorded</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

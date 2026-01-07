"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Receipt, Plus, TrendingDown } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function ExpenseAccountsPage() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const { data: expenses, isLoading } = trpc.expensesV2.listExpenses.useQuery({
        limit: 50,
    });

    const { data: summary } = trpc.expensesV2.getSummaryByCategory.useQuery({
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
    });

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <Skeleton className="h-4 w-24 mb-2" />
                                <Skeleton className="h-8 w-32" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-40" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const totalExpenses = summary?.grandTotal || 0;
    const categoryCount = summary?.categories?.length || 0;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Expense Accounts</h1>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <TrendingDown className="h-4 w-4 text-red-500" />
                            Total Expenses
                        </div>
                        <p className="text-2xl font-bold text-red-600">₹{totalExpenses.toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Receipt className="h-4 w-4" />
                            This Month
                        </div>
                        <p className="text-2xl font-bold">₹{totalExpenses.toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            Categories
                        </div>
                        <p className="text-2xl font-bold">{categoryCount}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                    {expenses?.expenses && expenses.expenses.length > 0 ? (
                        <div className="space-y-3">
                            {expenses.expenses.map((expense) => (
                                <div key={expense.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                    <div>
                                        <p className="font-medium">{expense.description}</p>
                                        <p className="text-sm text-muted-foreground">{expense.category?.name || "Uncategorized"}</p>
                                    </div>
                                    <p className="font-bold text-red-600">-₹{Number(expense.amount).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-8">No expenses recorded yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

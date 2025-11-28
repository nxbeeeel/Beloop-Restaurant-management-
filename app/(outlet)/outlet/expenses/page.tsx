"use client";

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Receipt } from "lucide-react";
import ExpenseEntryForm from "@/components/expenses/ExpenseEntryForm";
import { useOutlet } from "@/hooks/use-outlet";

interface Expense {
    id: string;
    date: string | Date;
    category: string;
    description: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    amount: any;
    paymentMethod: string;
    staff: {
        name: string;
    };
}

export default function ExpensesPage() {
    const { outletId, isLoading: userLoading } = useOutlet();

    const { data: expenses, isLoading: expensesLoading } = trpc.expenses.list.useQuery(
        {
            outletId: outletId || "",
            startDate: new Date(new Date().getFullYear(), 0, 1), // Start of year
            endDate: new Date(),
        },
        { enabled: !!outletId }
    );

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
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Expenses
                    </h2>
                    <p className="text-muted-foreground">
                        Track and manage outlet expenses.
                    </p>
                </div>
            </div>

            {/* Expense Entry Form */}
            <ExpenseEntryForm outletId={outletId} />

            {/* Expenses List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Receipt className="w-5 h-5" /> Recent Expenses
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {expensesLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading...</div>
                    ) : (
                        <div className="rounded-md border overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground font-medium">
                                    <tr>
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Category</th>
                                        <th className="p-4">Description</th>
                                        <th className="p-4 text-right">Amount</th>
                                        <th className="p-4">Method</th>
                                        <th className="p-4">Staff</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {expenses?.map((expense: Expense) => (
                                        <tr key={expense.id} className="hover:bg-muted/50 transition-colors">
                                            <td className="p-4 font-medium">
                                                {format(new Date(expense.date), "MMM d, yyyy")}
                                            </td>
                                            <td className="p-4">
                                                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-700/10">
                                                    {expense.category.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4 text-muted-foreground max-w-xs truncate">
                                                {expense.description || '-'}
                                            </td>
                                            <td className="p-4 text-right font-bold">
                                                ₹{Number(expense.amount).toFixed(2)}
                                            </td>
                                            <td className="p-4 text-xs text-muted-foreground">
                                                {expense.paymentMethod}
                                            </td>
                                            <td className="p-4 text-muted-foreground">
                                                {expense.staff.name}
                                            </td>
                                        </tr>
                                    ))}
                                    {(!expenses || expenses.length === 0) && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                                No expenses recorded yet. Add your first expense above!
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, TrendingUp, TrendingDown, Calendar, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MonthlyReportViewProps {
    initialOutletId: string;
    outlets: { id: string; name: string }[];
}

export default function MonthlyReportView({ initialOutletId, outlets }: MonthlyReportViewProps) {
    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
    const [selectedOutletId, setSelectedOutletId] = useState<string>(initialOutletId);

    // Fetch monthly report
    const { data: monthlyReport, isLoading } = trpc.reports.getMonthlyReport.useQuery({
        outletId: selectedOutletId,
        year: selectedYear,
        month: selectedMonth,
    });

    // Fetch comparison data if "ALL" is selected
    const { data: comparisonData } = trpc.reports.getOutletComparison.useQuery({
        year: selectedYear,
        month: selectedMonth,
    }, {
        enabled: selectedOutletId === 'ALL'
    });

    const handlePreviousMonth = () => {
        if (selectedMonth === 1) {
            setSelectedMonth(12);
            setSelectedYear(selectedYear - 1);
        } else {
            setSelectedMonth(selectedMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (selectedMonth === 12) {
            setSelectedMonth(1);
            setSelectedYear(selectedYear + 1);
        } else {
            setSelectedMonth(selectedMonth + 1);
        }
    };

    const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' });

    if (isLoading) {
        return <div className="flex items-center justify-center h-96">Loading...</div>;
    }

    const summary = monthlyReport?.summary;
    const netProfit = Number(summary?.totalSales || 0) - Number(summary?.totalExpenses || 0);
    const profitMargin = summary?.totalSales ? ((netProfit / Number(summary.totalSales)) * 100).toFixed(1) : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Monthly Report
                    </h2>
                    <p className="text-muted-foreground">
                        {selectedOutletId === 'ALL' ? 'All Outlets' : monthlyReport?.outlet.name} - {monthName} {selectedYear}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Select value={selectedOutletId} onValueChange={setSelectedOutletId}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Outlet" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Outlets</SelectItem>
                            {outlets.map((outlet) => (
                                <SelectItem key={outlet.id} value={outlet.id}>
                                    {outlet.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
                        ← Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleNextMonth}>
                        Next →
                    </Button>
                    <Button className="ml-2">
                        <Download className="mr-2 h-4 w-4" />
                        Export PDF
                    </Button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{summary?.totalSales ? Number(summary.totalSales).toLocaleString() : 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {selectedOutletId === 'ALL' ? 'Aggregated' : `${monthlyReport?.sales.length || 0} days recorded`}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{summary?.totalExpenses ? Number(summary.totalExpenses).toLocaleString() : 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {selectedOutletId === 'ALL' ? 'Aggregated' : `${monthlyReport?.expenses.length || 0} transactions`}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                        <Calendar className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₹{netProfit.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Margin: {profitMargin}%
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Daily Sales</CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ₹{monthlyReport?.sales.length && summary?.totalSales ? Math.round(Number(summary.totalSales) / monthlyReport.sales.length).toLocaleString() : 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Per operating day
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Comparative Analysis (Only visible when ALL is selected) */}
            {selectedOutletId === 'ALL' && comparisonData && (
                <div className="grid gap-4 md:grid-cols-2">
                    <Card className="col-span-2">
                        <CardHeader>
                            <CardTitle>Outlet Performance Comparison</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={comparisonData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="outletName" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="sales" name="Sales" fill="#16a34a" />
                                        <Bar dataKey="expenses" name="Expenses" fill="#dc2626" />
                                        <Bar dataKey="profit" name="Profit" fill="#2563eb" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Detailed Expenses Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors hover:bg-muted/50">
                                    <th className="h-12 px-4 text-left align-middle font-medium">Date</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium">Category</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium">Description</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium">Submitted By</th>
                                    <th className="h-12 px-4 text-right align-middle font-medium">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {monthlyReport?.expenses.map((expense) => (
                                    <tr key={expense.id} className="border-b transition-colors hover:bg-muted/50">
                                        <td className="p-4 align-middle">{new Date(expense.date).toLocaleDateString()}</td>
                                        <td className="p-4 align-middle">
                                            <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="p-4 align-middle">{expense.description || '-'}</td>
                                        <td className="p-4 align-middle text-muted-foreground">
                                            {expense.staff.name}
                                        </td>
                                        <td className="p-4 align-middle text-right font-medium">
                                            ₹{Number(expense.amount).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

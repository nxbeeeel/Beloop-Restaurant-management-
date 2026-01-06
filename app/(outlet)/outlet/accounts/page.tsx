"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useOutlet } from "@/hooks/use-outlet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Download,
    TrendingUp,
    TrendingDown,
    IndianRupee,
    CreditCard,
    Calendar,
    Filter
} from "lucide-react";
import { exportToCsv, formatCurrency, formatDate } from "@/lib/export";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton, SkeletonTable } from "@/components/ui/skeleton-loaders";

export default function AccountsPage() {
    const { outletId, isLoading: userLoading } = useOutlet();
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    // Get months for dropdown (last 12 months)
    const months = useMemo(() => {
        const result = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            result.push({
                value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            });
        }
        return result;
    }, []);

    // Fetch monthly summary
    const { data: summary, isLoading: summaryLoading } = trpc.reports.getMonthlySummary.useQuery(
        { outletId: outletId || "", month: selectedMonth },
        { enabled: !!outletId, staleTime: 60000 }
    );

    // Fetch daily closures for cashflow
    const { data: dailyClosures, isLoading: closuresLoading } = trpc.dailyClosure.list.useQuery(
        { outletId: outletId || "", month: selectedMonth },
        { enabled: !!outletId, staleTime: 60000 }
    );

    // Fetch expenses
    const { data: expenses, isLoading: expensesLoading } = trpc.expenses.list.useQuery(
        { outletId: outletId || "", month: selectedMonth },
        { enabled: !!outletId, staleTime: 60000 }
    );

    // Fetch pending supplier payments (creditors)
    const { data: suppliers } = trpc.suppliers.list.useQuery(undefined, { enabled: true });
    const creditors = suppliers?.filter(s => s.balance > 0) || [];

    const isLoading = userLoading || summaryLoading;

    // Export handlers
    const handleExportCashflow = () => {
        if (!dailyClosures?.length) {
            toast.error("No data to export");
            return;
        }
        exportToCsv(dailyClosures, [
            { header: "Date", accessor: (r) => formatDate(r.date) },
            { header: "Cash Sales", accessor: (r) => Number(r.cashSale).toFixed(2) },
            { header: "Bank Sales", accessor: (r) => Number(r.bankSale).toFixed(2) },
            { header: "Online Sales", accessor: (r) => Number(r.otherOnline || 0).toFixed(2) },
            { header: "Total Sales", accessor: (r) => Number(r.totalSale).toFixed(2) },
            { header: "Total Expenses", accessor: (r) => Number(r.totalExpense).toFixed(2) },
            { header: "Profit/Loss", accessor: (r) => Number(r.profit).toFixed(2) },
        ], `cashflow-${selectedMonth}`);
        toast.success("Exported Cashflow");
    };

    const handleExportExpenses = () => {
        if (!expenses?.length) {
            toast.error("No expenses to export");
            return;
        }
        exportToCsv(expenses, [
            { header: "Date", accessor: (r) => formatDate(r.date) },
            { header: "Category", accessor: "category" },
            { header: "Amount (₹)", accessor: (r) => Number(r.amount).toFixed(2) },
            { header: "Payment Method", accessor: "paymentMethod" },
            { header: "Description", accessor: "description" },
        ], `expenses-${selectedMonth}`);
        toast.success("Exported Expenses");
    };

    const handleExportCreditors = () => {
        if (!creditors.length) {
            toast.error("No creditors to export");
            return;
        }
        exportToCsv(creditors, [
            { header: "Supplier", accessor: "name" },
            { header: "Balance (₹)", accessor: (r) => r.balance.toFixed(2) },
            { header: "Phone", accessor: "whatsappNumber" },
            { header: "Last Payment", accessor: (r) => r.lastPayment ? formatDate(r.lastPayment.date) : "-" },
        ], `creditors-${selectedMonth}`);
        toast.success("Exported Creditors");
    };

    if (isLoading) {
        return (
            <div className="space-y-6 pb-20">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-40" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                </div>
                <SkeletonTable rows={6} cols={6} />
            </div>
        );
    }

    // P&L calculations
    const totalSales = Number(summary?.totalSales || 0);
    const totalExpenses = Number(summary?.totalExpenses || 0);
    const netProfit = totalSales - totalExpenses;
    const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    return (
        <div className="space-y-6 pb-20 md:pb-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Accounts</h1>
                    <p className="text-gray-500 text-sm">Financial overview and reports</p>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map(m => (
                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* P&L Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-none shadow-sm bg-white ring-1 ring-gray-100">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-500">Total Sales</p>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSales)}</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white ring-1 ring-gray-100">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-500">Total Expenses</p>
                            <TrendingDown className="h-4 w-4 text-red-500" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
                    </CardContent>
                </Card>
                <Card className={`border-none shadow-sm ring-1 ${netProfit >= 0 ? 'bg-green-50 ring-green-100' : 'bg-red-50 ring-red-100'}`}>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-600">Net Profit</p>
                            <IndianRupee className={`h-4 w-4 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                        </div>
                        <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {formatCurrency(Math.abs(netProfit))}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{profitMargin.toFixed(1)}% margin</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-orange-50 ring-1 ring-orange-100">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-orange-700">Pending to Suppliers</p>
                            <CreditCard className="h-4 w-4 text-orange-500" />
                        </div>
                        <p className="text-2xl font-bold text-orange-700">
                            {formatCurrency(creditors.reduce((sum, c) => sum + c.balance, 0))}
                        </p>
                        <p className="text-xs text-orange-600 mt-1">{creditors.length} suppliers</p>
                    </CardContent>
                </Card>
            </div>

            {/* Detail Tabs */}
            <Tabs defaultValue="cashflow" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
                    <TabsTrigger value="expenses">Expenses</TabsTrigger>
                    <TabsTrigger value="creditors">Creditors</TabsTrigger>
                </TabsList>

                {/* Cash Flow Tab */}
                <TabsContent value="cashflow" className="space-y-4">
                    <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={handleExportCashflow}>
                            <Download className="h-4 w-4 mr-2" /> Export CSV
                        </Button>
                    </div>
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Cash Sales</TableHead>
                                    <TableHead className="text-right">Bank Sales</TableHead>
                                    <TableHead className="text-right">Online</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">Expenses</TableHead>
                                    <TableHead className="text-right">P/L</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {closuresLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                                    </TableRow>
                                ) : dailyClosures?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                            No daily closures this month
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    dailyClosures?.map((dc: any) => {
                                        const profit = Number(dc.totalSale) - Number(dc.totalExpense);
                                        return (
                                            <TableRow key={dc.id}>
                                                <TableCell className="font-medium">{formatDate(dc.date)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(dc.cashSale)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(dc.bankSale)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(dc.otherOnline || 0)}</TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(dc.totalSale)}</TableCell>
                                                <TableCell className="text-right text-red-600">{formatCurrency(dc.totalExpense)}</TableCell>
                                                <TableCell className={`text-right font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatCurrency(profit)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* Expenses Tab */}
                <TabsContent value="expenses" className="space-y-4">
                    <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={handleExportExpenses}>
                            <Download className="h-4 w-4 mr-2" /> Export CSV
                        </Button>
                    </div>
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Method</TableHead>
                                    <TableHead>Description</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expensesLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                                    </TableRow>
                                ) : expenses?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                            No expenses this month
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    expenses?.map((exp: any) => (
                                        <TableRow key={exp.id}>
                                            <TableCell>{formatDate(exp.date)}</TableCell>
                                            <TableCell className="font-medium">{exp.category}</TableCell>
                                            <TableCell className="text-right text-red-600">{formatCurrency(exp.amount)}</TableCell>
                                            <TableCell>{exp.paymentMethod}</TableCell>
                                            <TableCell className="text-gray-500 truncate max-w-[200px]">{exp.description || '-'}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* Creditors Tab */}
                <TabsContent value="creditors" className="space-y-4">
                    <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={handleExportCreditors}>
                            <Download className="h-4 w-4 mr-2" /> Export CSV
                        </Button>
                    </div>
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Supplier</TableHead>
                                    <TableHead className="text-right">Balance Due</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Last Payment</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {creditors.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                            No pending supplier payments 🎉
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    creditors.map((c) => (
                                        <TableRow key={c.id}>
                                            <TableCell className="font-medium">{c.name}</TableCell>
                                            <TableCell className="text-right text-orange-600 font-semibold">
                                                {formatCurrency(c.balance)}
                                            </TableCell>
                                            <TableCell className="text-gray-500">{c.whatsappNumber || '-'}</TableCell>
                                            <TableCell>
                                                {c.lastPayment ? (
                                                    <span className="text-gray-500">
                                                        {formatCurrency(c.lastPayment.amount)} on {formatDate(c.lastPayment.date)}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">Never paid</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

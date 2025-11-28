"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Receipt, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useOutlet } from "@/hooks/use-outlet";

export default function EntriesPage() {
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    // Adjustments state
    const [adjustDate, setAdjustDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [swiggyPayout, setSwiggyPayout] = useState("");
    const [zomatoPayout, setZomatoPayout] = useState("");
    const [cashWithdrawal, setCashWithdrawal] = useState("");

    const { outletId, isLoading: userLoading } = useOutlet();

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

    // Get sale for adjustment date
    const { data: saleForAdjustment } = trpc.adjustments.getForDate.useQuery(
        { outletId: outletId || "", date: new Date(adjustDate) },
        { enabled: !!outletId && !!adjustDate }
    );

    const utils = trpc.useUtils();
    const updateAdjustments = trpc.adjustments.update.useMutation({
        onSuccess: () => {
            toast.success("Adjustments saved successfully!");
            utils.sales.list.invalidate();
            utils.adjustments.getForDate.invalidate();
            // Clear inputs
            setSwiggyPayout("");
            setZomatoPayout("");
            setCashWithdrawal("");
        },
        onError: (e) => toast.error(e.message)
    });

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

    const handleSaveAdjustment = (field: 'swiggy' | 'zomato' | 'withdrawal') => {
        if (!saleForAdjustment) {
            toast.error("No sale entry found for this date");
            return;
        }

        const value = field === 'swiggy' ? swiggyPayout : field === 'zomato' ? zomatoPayout : cashWithdrawal;
        const numValue = parseFloat(value);

        if (!value || isNaN(numValue) || numValue < 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        updateAdjustments.mutate({
            saleId: saleForAdjustment.id,
            swiggyPayout: field === 'swiggy' ? numValue : undefined,
            zomatoPayout: field === 'zomato' ? numValue : undefined,
            cashWithdrawal: field === 'withdrawal' ? numValue : undefined,
        });
    };

    const formatCurrency = (amount: number) => {
        return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatCategory = (category: string) => {
        return category.replace(/_/g, ' ');
    };

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
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">📋 Entries</h1>
                    <p className="text-gray-500">View and manage all sales and expense entries</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handlePreviousMonth} variant="outline" size="icon">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-3 py-2 border rounded-lg"
                    />
                    <Button onClick={handleNextMonth} variant="outline" size="icon">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Adjustments Card */}
            <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">🎯 Payouts & Withdrawals</CardTitle>
                    <CardDescription className="text-sm">Update Swiggy/Zomato payouts or cash withdrawal for any date</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="adjustDate" className="text-sm font-medium">Adjustment Date</Label>
                        <Input
                            id="adjustDate"
                            type="date"
                            value={adjustDate}
                            onChange={(e) => setAdjustDate(e.target.value)}
                            className="h-11"
                        />
                        {saleForAdjustment && (
                            <p className="text-xs text-gray-600">
                                Current: Swiggy Payout: {formatCurrency(Number(saleForAdjustment.swiggyPayout))},
                                Zomato Payout: {formatCurrency(Number(saleForAdjustment.zomatoPayout))},
                                Cash Withdrawal: {formatCurrency(Number(saleForAdjustment.cashWithdrawal))}
                            </p>
                        )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Swiggy Payout (₹)</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={swiggyPayout}
                                    onChange={(e) => setSwiggyPayout(e.target.value)}
                                    placeholder="0.00"
                                    className="flex-1 h-11"
                                />
                                <Button
                                    onClick={() => handleSaveAdjustment('swiggy')}
                                    disabled={updateAdjustments.isPending}
                                    className="px-3 h-11"
                                >
                                    Save
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Zomato Payout (₹)</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={zomatoPayout}
                                    onChange={(e) => setZomatoPayout(e.target.value)}
                                    placeholder="0.00"
                                    className="flex-1 h-11"
                                />
                                <Button
                                    onClick={() => handleSaveAdjustment('zomato')}
                                    disabled={updateAdjustments.isPending}
                                    className="px-3 h-11"
                                >
                                    Save
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Cash Withdrawal (₹)</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={cashWithdrawal}
                                    onChange={(e) => setCashWithdrawal(e.target.value)}
                                    placeholder="0.00"
                                    className="flex-1 h-11"
                                />
                                <Button
                                    onClick={() => handleSaveAdjustment('withdrawal')}
                                    disabled={updateAdjustments.isPending}
                                    className="px-3 h-11"
                                >
                                    Save
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="sales" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-12">
                    <TabsTrigger value="sales" className="text-base font-semibold">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Sales Entries
                    </TabsTrigger>
                    <TabsTrigger value="expenses" className="text-base font-semibold">
                        <Receipt className="h-4 w-4 mr-2" />
                        Expense Entries
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="sales" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Sales Entries - {format(startDate, 'MMMM yyyy')}</CardTitle>
                            <CardDescription>All sales transactions for the selected month</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {salesLoading ? (
                                <p className="text-center py-8 text-gray-500">Loading...</p>
                            ) : !sales || sales.length === 0 ? (
                                <p className="text-center py-8 text-gray-500">No sales entries found</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 text-muted-foreground font-medium">
                                            <tr>
                                                <th className="p-3 text-left">Date</th>
                                                <th className="p-3 text-right">Cash Sale</th>
                                                <th className="p-3 text-right">Bank Sale</th>
                                                <th className="p-3 text-right">Swiggy</th>
                                                <th className="p-3 text-right">Zomato</th>
                                                <th className="p-3 text-right">Total Sale</th>
                                                <th className="p-3 text-right">Cash in Hand</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {sales.map((sale) => (
                                                <tr key={sale.id} className="hover:bg-muted/50">
                                                    <td className="p-3 font-medium">
                                                        {format(new Date(sale.date), 'dd MMM yyyy')}
                                                    </td>
                                                    <td className="p-3 text-right">{formatCurrency(Number(sale.cashSale))}</td>
                                                    <td className="p-3 text-right">{formatCurrency(Number(sale.bankSale))}</td>
                                                    <td className="p-3 text-right">{formatCurrency(Number(sale.swiggy))}</td>
                                                    <td className="p-3 text-right">{formatCurrency(Number(sale.zomato))}</td>
                                                    <td className="p-3 text-right font-bold text-green-600">
                                                        {formatCurrency(Number(sale.totalSale))}
                                                    </td>
                                                    <td className="p-3 text-right">{formatCurrency(Number(sale.cashInHand))}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50 font-bold">
                                            <tr>
                                                <td className="p-3">TOTAL</td>
                                                <td className="p-3 text-right">
                                                    {formatCurrency(sales.reduce((sum, s) => sum + Number(s.cashSale), 0))}
                                                </td>
                                                <td className="p-3 text-right">
                                                    {formatCurrency(sales.reduce((sum, s) => sum + Number(s.bankSale), 0))}
                                                </td>
                                                <td className="p-3 text-right">
                                                    {formatCurrency(sales.reduce((sum, s) => sum + Number(s.swiggy), 0))}
                                                </td>
                                                <td className="p-3 text-right">
                                                    {formatCurrency(sales.reduce((sum, s) => sum + Number(s.zomato), 0))}
                                                </td>
                                                <td className="p-3 text-right text-green-600">
                                                    {formatCurrency(sales.reduce((sum, s) => sum + Number(s.totalSale), 0))}
                                                </td>
                                                <td className="p-3 text-right">-</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="expenses" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Expense Entries - {format(startDate, 'MMMM yyyy')}</CardTitle>
                            <CardDescription>All expense transactions for the selected month</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {expensesLoading ? (
                                <p className="text-center py-8 text-gray-500">Loading...</p>
                            ) : !expenses || expenses.length === 0 ? (
                                <p className="text-center py-8 text-gray-500">No expense entries found</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 text-muted-foreground font-medium">
                                            <tr>
                                                <th className="p-3 text-left">Date</th>
                                                <th className="p-3 text-left">Category</th>
                                                <th className="p-3 text-left">Description</th>
                                                <th className="p-3 text-center">Payment</th>
                                                <th className="p-3 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {expenses.map((expense) => (
                                                <tr key={expense.id} className="hover:bg-muted/50">
                                                    <td className="p-3 font-medium">
                                                        {format(new Date(expense.date), 'dd MMM yyyy')}
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                                                            {formatCategory(expense.category)}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-gray-600">
                                                        {expense.description || '-'}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <span className={`px-2 py-1 rounded text-xs ${expense.paymentMethod === 'CASH'
                                                            ? 'bg-green-50 text-green-700'
                                                            : 'bg-purple-50 text-purple-700'
                                                            }`}>
                                                            {expense.paymentMethod}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-right font-semibold text-red-600">
                                                        {formatCurrency(Number(expense.amount))}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50 font-bold">
                                            <tr>
                                                <td className="p-3" colSpan={4}>TOTAL EXPENSES</td>
                                                <td className="p-3 text-right text-red-600">
                                                    {formatCurrency(expenses.reduce((sum, e) => sum + Number(e.amount), 0))}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Summary Card */}
            {sales && expenses && sales.length > 0 && expenses.length > 0 && (
                <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center">
                                <p className="text-sm text-gray-600">Total Sales</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {formatCurrency(sales.reduce((sum, s) => sum + Number(s.totalSale), 0))}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-gray-600">Total Expenses</p>
                                <p className="text-2xl font-bold text-red-600">
                                    {formatCurrency(expenses.reduce((sum, e) => sum + Number(e.amount), 0))}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-gray-600">Net Profit</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {formatCurrency(
                                        sales.reduce((sum, s) => sum + Number(s.totalSale), 0) -
                                        expenses.reduce((sum, e) => sum + Number(e.amount), 0)
                                    )}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

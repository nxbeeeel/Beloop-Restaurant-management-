"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, Save, Calculator, DollarSign, AlertCircle, CheckCircle2, Wallet, Receipt, TrendingUp } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

export default function DailyCloseForm({ outletId }: { outletId: string }) {
    const [date, setDate] = useState<Date>(new Date());
    const [cashInHand, setCashInHand] = useState<string>("");


    // Stock Snapshot State
    const [stock, setStock] = useState<Record<string, number>>({});
    const [newProductSku, setNewProductSku] = useState("");

    // Fetch Sales Data
    const { data: salesData, isLoading: isLoadingSales } = trpc.sales.getDaily.useQuery({
        outletId,
        date: startOfDay(date) // Ensure we query for the date part
    });

    // Fetch Expenses Data
    const { data: expensesData } = trpc.expenses.list.useQuery({
        outletId,
        startDate: startOfDay(date),
        endDate: endOfDay(date)
    });

    // Calculations
    const totalSales = useMemo(() => {
        if (!salesData) return 0;
        return Number(salesData.totalSale) || 0;
    }, [salesData]);

    const totalExpenses = useMemo(() => {
        if (!expensesData) return 0;
        return expensesData.reduce((sum, exp) => sum + Number(exp.amount), 0);
    }, [expensesData]);

    const cashSales = useMemo(() => {
        if (!salesData) return 0;
        return Number(salesData.cashSale) || 0;
    }, [salesData]);

    const cashExpenses = useMemo(() => {
        if (!expensesData) return 0;
        return expensesData
            .filter(e => e.paymentMethod === "CASH")
            .reduce((sum, exp) => sum + Number(exp.amount), 0);
    }, [expensesData]);

    const theoreticalCash = cashSales - cashExpenses;
    const actualCash = Number(cashInHand) || 0;
    const difference = actualCash - theoreticalCash;

    const createClosure = trpc.dailyClosure.create.useMutation({
        onSuccess: () => {
            toast.success("Daily closing saved successfully!");
            setStock({});
            setCashInHand("");

        },
        onError: (e) => toast.error(e.message),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!salesData) {
            toast.error("No sales data found for this date. Please enter sales first.");
            return;
        }

        createClosure.mutate({
            outletId,
            date: date.toISOString(),
            cashSale: Number(salesData.cashSale),
            bankSale: Number(salesData.bankSale),
            zomatoSale: Number(salesData.zomato),
            swiggySale: Number(salesData.swiggy),
            expenses: expensesData?.map(e => ({
                amount: Number(e.amount),
                description: e.description || e.category
            })) || [],
            stockSnapshot: stock,
        });
    };

    const addProductToStock = () => {
        if (!newProductSku) return;
        setStock(prev => ({ ...prev, [newProductSku]: 0 }));
        setNewProductSku("");
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Daily Closing</h1>
                    <p className="text-gray-500 text-sm md:text-base">Reconcile cash and close your day</p>
                </div>
                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
                    <span className="text-sm font-medium text-gray-500 pl-2">Date:</span>
                    <Input
                        type="date"
                        value={format(date, "yyyy-MM-dd")}
                        onChange={(e) => setDate(new Date(e.target.value))}
                        className="border-0 h-8 w-auto focus-visible:ring-0 p-0"
                    />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-blue-600">Total Sales</span>
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="text-2xl font-bold text-blue-900">
                            ₹{totalSales.toLocaleString('en-IN')}
                        </div>
                        <p className="text-xs text-blue-600 mt-1">
                            Cash: ₹{cashSales.toLocaleString('en-IN')}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-rose-50 to-pink-50 border-rose-100">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-rose-600">Total Expenses</span>
                            <Receipt className="h-4 w-4 text-rose-600" />
                        </div>
                        <div className="text-2xl font-bold text-rose-900">
                            ₹{totalExpenses.toLocaleString('en-IN')}
                        </div>
                        <p className="text-xs text-rose-600 mt-1">
                            Cash Exp: ₹{cashExpenses.toLocaleString('en-IN')}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-100">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-emerald-600">Theoretical Cash</span>
                            <Wallet className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="text-2xl font-bold text-emerald-900">
                            ₹{theoreticalCash.toLocaleString('en-IN')}
                        </div>
                        <p className="text-xs text-emerald-600 mt-1">
                            Sales - Expenses
                        </p>
                    </CardContent>
                </Card>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Cash Reconciliation */}
                <Card className="overflow-hidden border-0 shadow-lg ring-1 ring-gray-100">
                    <CardHeader className="bg-gray-50/50 border-b border-gray-100">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Calculator className="h-5 w-5 text-gray-500" />
                            Cash Reconciliation
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                                        Cash in Hand (Counted)
                                    </label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            type="number"
                                            value={cashInHand}
                                            onChange={(e) => setCashInHand(e.target.value)}
                                            placeholder="0.00"
                                            className="pl-10 text-lg font-semibold h-12"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Count the physical cash in the drawer and enter the amount here.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-6 flex flex-col justify-center items-center text-center">
                                <span className="text-sm font-medium text-gray-500 mb-2">Difference</span>
                                <div className={cn(
                                    "text-3xl font-bold mb-2",
                                    difference === 0 ? "text-green-600" :
                                        difference > 0 ? "text-blue-600" : "text-red-600"
                                )}>
                                    {difference > 0 ? "+" : ""}₹{difference.toLocaleString('en-IN')}
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    {difference === 0 ? (
                                        <span className="flex items-center text-green-700 bg-green-100 px-2 py-1 rounded-full">
                                            <CheckCircle2 className="h-3 w-3 mr-1" /> Balanced
                                        </span>
                                    ) : difference > 0 ? (
                                        <span className="flex items-center text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                                            <AlertCircle className="h-3 w-3 mr-1" /> Excess
                                        </span>
                                    ) : (
                                        <span className="flex items-center text-red-700 bg-red-100 px-2 py-1 rounded-full">
                                            <AlertCircle className="h-3 w-3 mr-1" /> Shortage
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stock Snapshot (Optional) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Stock Snapshot (Optional)</CardTitle>
                        <CardDescription>Record closing stock for key items</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {Object.entries(stock).map(([sku, qty]) => (
                            <div key={sku} className="flex items-center gap-3 bg-gray-50 p-2 rounded-md">
                                <div className="flex-1 font-medium pl-2">{sku}</div>
                                <Input
                                    type="number"
                                    value={qty}
                                    onChange={(e) => setStock(prev => ({ ...prev, [sku]: Number(e.target.value) }))}
                                    className="w-24 h-9"
                                />
                                <Button type="button" variant="ghost" size="icon" onClick={() => {
                                    const newStock = { ...stock };
                                    delete newStock[sku];
                                    setStock(newStock);
                                }}>
                                    <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                                </Button>
                            </div>
                        ))}

                        <div className="flex gap-2">
                            <Input
                                placeholder="Product SKU / Name"
                                value={newProductSku}
                                onChange={(e) => setNewProductSku(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addProductToStock())}
                            />
                            <Button type="button" variant="outline" onClick={addProductToStock}>
                                <Plus className="h-4 w-4 mr-2" /> Add Item
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-gradient-to-r from-gray-900 to-gray-800 hover:from-black hover:to-gray-900 shadow-lg"
                    disabled={createClosure.isPending || isLoadingSales}
                >
                    <Save className="h-5 w-5 mr-2" />
                    {createClosure.isPending ? "Saving..." : "Complete Daily Closing"}
                </Button>
            </form>
        </div>
    );
}

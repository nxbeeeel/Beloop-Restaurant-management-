"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Calendar, Save, ChevronLeft, ChevronRight } from "lucide-react";

export default function SalesEntryForm({ outletId }: { outletId: string }) {
    const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [cashSale, setCashSale] = useState("");
    const [bankSale, setBankSale] = useState("");
    const [cashInHand, setCashInHand] = useState("");
    const [cashInBank, setCashInBank] = useState("");
    const [zomatoSale, setZomatoSale] = useState("");
    const [swiggySale, setSwiggySale] = useState("");

    // Quick expenses
    const [oil, setOil] = useState("");
    const [waterCan, setWaterCan] = useState("");
    const [waterBottle, setWaterBottle] = useState("");
    const [miscExpense, setMiscExpense] = useState("");

    const utils = trpc.useUtils();

    const createSale = trpc.sales.create.useMutation({
        onSuccess: () => {
            toast.success("Sales entry saved successfully!");
            utils.sales.list.invalidate();
        },
        onError: (e) => toast.error(e.message)
    });

    const createExpense = trpc.expenses.create.useMutation({
        onSuccess: () => {
            utils.expenses.list.invalidate();
        }
    });

    const handlePreviousDay = () => {
        const currentDate = new Date(date);
        currentDate.setDate(currentDate.getDate() - 1);
        setDate(currentDate.toISOString().split("T")[0]);
    };

    const handleNextDay = () => {
        const currentDate = new Date(date);
        currentDate.setDate(currentDate.getDate() + 1);
        setDate(currentDate.toISOString().split("T")[0]);
    };

    const handleToday = () => {
        setDate(new Date().toISOString().split("T")[0]);
    };

    const handleClearAll = () => {
        setCashSale("");
        setBankSale("");
        setCashInHand("");
        setCashInBank("");
        setZomatoSale("");
        setSwiggySale("");
        setOil("");
        setWaterCan("");
        setWaterBottle("");
        setMiscExpense("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const cash = parseFloat(cashSale) || 0;
        const bank = parseFloat(bankSale) || 0;
        const zomato = parseFloat(zomatoSale) || 0;
        const swiggy = parseFloat(swiggySale) || 0;

        if (cash + bank + zomato + swiggy === 0) {
            toast.error("Please enter at least one sale amount");
            return;
        }

        try {
            // Save sales entry
            await createSale.mutateAsync({
                outletId,
                date: new Date(date),
                cashSale: cash,
                bankSale: bank,
                swiggy: swiggy,
                zomato: zomato,
                swiggyPayout: 0,
                zomatoPayout: 0,
                cashInHand: parseFloat(cashInHand) || 0,
                cashInBank: parseFloat(cashInBank) || 0,
                cashWithdrawal: 0,
            });

            // Submit quick expenses if any
            const quickExpenses = [
                { category: "FUEL", amount: parseFloat(oil) || 0 },
                { category: "SUPPLIES", amount: parseFloat(waterCan) || 0 },
                { category: "SUPPLIES", amount: parseFloat(waterBottle) || 0 },
                { category: "MISCELLANEOUS", amount: parseFloat(miscExpense) || 0 },
            ];

            for (const expense of quickExpenses) {
                if (expense.amount > 0) {
                    await createExpense.mutateAsync({
                        outletId,
                        date: new Date(date),
                        category: expense.category as any,
                        amount: expense.amount,
                        paymentMethod: "CASH" as any,
                        description: expense.category === "FUEL" ? "Oil" :
                            expense.category === "SUPPLIES" && expense.amount === (parseFloat(waterCan) || 0) ? "Water Can" :
                                expense.category === "SUPPLIES" ? "Water Bottle" : "Misc",
                    });
                }
            }

            // Clear form
            handleClearAll();
        } catch (error: any) {
            toast.error(error.message || "Failed to save");
        }
    };

    const cashBankTotal = (parseFloat(cashSale) || 0) + (parseFloat(bankSale) || 0);
    const totalSalesWithPlatforms = cashBankTotal + (parseFloat(zomatoSale) || 0) + (parseFloat(swiggySale) || 0);
    const quickExpensesTotal = (parseFloat(oil) || 0) + (parseFloat(waterCan) || 0) +
        (parseFloat(waterBottle) || 0) + (parseFloat(miscExpense) || 0);

    const formatCurrency = (amount: number) => {
        return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="space-y-4 max-w-4xl mx-auto pb-10">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl sm:text-2xl">📊 Daily Sales Entry</CardTitle>
                    <CardDescription className="text-sm">Enter today's sales information</CardDescription>
                </CardHeader>
            </Card>

            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm ring-1 ring-gray-100">
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Date Selector with Navigation */}
                        <div className="space-y-2">
                            <Label htmlFor="date" className="text-base font-semibold">Date</Label>
                            <div className="flex gap-2">
                                <Button type="button" onClick={handlePreviousDay} variant="outline" className="h-12 w-12">
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                                <div className="flex-1 relative">
                                    <Input
                                        id="date"
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        required
                                        className="h-12 text-base pl-10"
                                    />
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                                </div>
                                <Button type="button" onClick={handleNextDay} variant="outline" className="h-12 w-12">
                                    <ChevronRight className="h-5 w-5" />
                                </Button>
                                <Button type="button" onClick={handleToday} variant="secondary" className="h-12 px-4 text-sm font-bold">
                                    Today
                                </Button>
                            </div>
                        </div>

                        {/* Sales Inputs Grid */}
                        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4">
                            {[
                                { id: "cashSale", label: "Cash Sale", value: cashSale, setter: setCashSale },
                                { id: "bankSale", label: "Bank Sale", value: bankSale, setter: setBankSale },
                                { id: "cashInHand", label: "Cash in Hand", value: cashInHand, setter: setCashInHand },
                                { id: "cashInBank", label: "Cash in Bank", value: cashInBank, setter: setCashInBank },
                                { id: "swiggy", label: "Swiggy", value: swiggySale, setter: setSwiggySale },
                                { id: "zomato", label: "Zomato", value: zomatoSale, setter: setZomatoSale },
                            ].map((field) => (
                                <div key={field.id} className="space-y-1.5">
                                    <Label htmlFor={field.id} className="text-sm font-semibold">{field.label} (₹)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                                        <Input
                                            id={field.id}
                                            type="number"
                                            step="0.01"
                                            value={field.value}
                                            onChange={(e) => field.setter(e.target.value)}
                                            placeholder="0.00"
                                            className="pl-8 h-11 text-sm"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Quick Cash Expenses */}
                        <Card className="bg-orange-50 border-orange-200">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base sm:text-lg text-slate-900">💰 Quick Cash Expenses</CardTitle>
                                <CardDescription className="text-xs text-slate-600">Common daily expenses (auto-saved with sales)</CardDescription>
                            </CardHeader>
                            <CardContent className="pb-4">
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: "oil", label: "Oil", value: oil, setter: setOil },
                                        { id: "waterCan", label: "Water Can", value: waterCan, setter: setWaterCan },
                                        { id: "waterBottle", label: "Water Bottle", value: waterBottle, setter: setWaterBottle },
                                        { id: "miscExpense", label: "Misc", value: miscExpense, setter: setMiscExpense },
                                    ].map((field) => (
                                        <div key={field.id} className="space-y-1">
                                            <Label htmlFor={field.id} className="text-sm font-semibold">{field.label} (₹)</Label>
                                            <Input
                                                id={field.id}
                                                type="number"
                                                step="0.01"
                                                value={field.value}
                                                onChange={(e) => field.setter(e.target.value)}
                                                placeholder="0.00"
                                                className="h-10 text-xs"
                                            />
                                        </div>
                                    ))}
                                </div>
                                {quickExpensesTotal > 0 && (
                                    <div className="mt-3 p-2 bg-orange-100 rounded text-center">
                                        <span className="text-sm font-semibold">Total: {formatCurrency(quickExpensesTotal)}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Sales Summary Card */}
                        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
                            <CardContent className="pt-4">
                                <div className="space-y-2">
                                    <div className="text-xs font-bold text-green-700 mb-2">TODAY'S SALES SUMMARY</div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-700">Cash + Bank Sale</span>
                                        <span className="font-bold text-base text-gray-900">{formatCurrency(cashBankTotal)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-green-200">
                                        <span className="text-sm font-semibold text-gray-900">Total (with Swiggy/Zomato)</span>
                                        <span className="text-xl font-bold text-green-600">{formatCurrency(totalSalesWithPlatforms)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleClearAll}
                                className="flex-1 h-14 text-base font-bold"
                                disabled={createSale.isPending}
                            >
                                🗑️ Clear All
                            </Button>
                            <Button
                                type="submit"
                                disabled={createSale.isPending}
                                className="flex-1 h-14 text-base font-bold shadow-lg shadow-primary/20"
                            >
                                {createSale.isPending ? (
                                    "⏳ Saving..."
                                ) : (
                                    <>
                                        <Save className="h-5 w-5 mr-2" />
                                        💾 Save Sales Entry
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Help Card */}
            <Card className="bg-blue-50/50 border-blue-100">
                <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                        <span className="text-xl">💡</span>
                        <div className="space-y-1">
                            <p className="font-medium text-blue-900 text-sm">Quick Tips</p>
                            <ul className="list-disc list-inside space-y-0.5 text-xs text-blue-700 opacity-80">
                                <li>Quick expenses are automatically saved as cash expenses</li>
                                <li>Use arrow buttons to navigate between dates</li>
                                <li>Enter cash in hand and bank for daily closing reconciliation</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

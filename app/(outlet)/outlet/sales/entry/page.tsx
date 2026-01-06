"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useOutlet } from "@/hooks/use-outlet";
import { Calendar, Save, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DailySalesPage() {
    const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [cashSale, setCashSale] = useState("");
    const [bankSale, setBankSale] = useState("");
    const [cashInHand, setCashInHand] = useState("");
    const [cashInBank, setCashInBank] = useState("");
    const [zomatoSale, setZomatoSale] = useState("");
    const [swiggySale, setSwiggySale] = useState("");
    const [cashWithdrawal, setCashWithdrawal] = useState("");
    const [closingNote, setClosingNote] = useState("");

    // Quick expenses
    const [oil, setOil] = useState("");
    const [waterCan, setWaterCan] = useState("");
    const [waterBottle, setWaterBottle] = useState("");
    const [miscExpense, setMiscExpense] = useState("");

    const { outletId, isLoading: userLoading, user } = useOutlet();

    // Role-based access
    const isStaff = user?.role === "STAFF";
    const isManager = user?.role === "OUTLET_MANAGER" || user?.role === "BRAND_ADMIN" || user?.role === "SUPER";
    const today = new Date().toISOString().split("T")[0];

    // Fetch yesterday's data for cash balance
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: yesterdaySale } = trpc.sales.getDaily.useQuery(
        { outletId: outletId || "", date: yesterday },
        { enabled: !!outletId }
    );

    // Fetch today's expenses
    const { data: todayExpenses } = trpc.expenses.list.useQuery(
        {
            outletId: outletId || "",
            startDate: new Date(date),
            endDate: new Date(date),
        },
        { enabled: !!outletId }
    );

    const utils = trpc.useUtils();

    const createSale = trpc.sales.create.useMutation({
        onMutate: async (newSale) => {
            // Cancel outgoing refetches
            await utils.sales.getDaily.cancel();

            // Snapshot previous value
            const previousSale = utils.sales.getDaily.getData({ outletId: outletId || "", date: new Date(date) });

            // Optimistically update
            utils.sales.getDaily.setData(
                { outletId: outletId || "", date: new Date(date) },
                (old) => {
                    if (!old) return old;
                    return {
                        ...old,
                        cashSale: newSale.cashSale,
                        bankSale: newSale.bankSale,
                        swiggy: newSale.swiggy,
                        zomato: newSale.zomato,
                        cashInHand: newSale.cashInHand,
                        cashInBank: newSale.cashInBank,
                        cashWithdrawal: newSale.cashWithdrawal,
                        swiggyPayout: newSale.swiggyPayout,
                        zomatoPayout: newSale.zomatoPayout,
                        updatedAt: new Date(),
                    } as unknown as typeof old;
                }
            );

            return { previousSale };
        },
        onSuccess: () => {
            toast.success("Daily sales & closing saved successfully!");
            handleClearAll();
        },
        onError: (e, _newSale, context) => {
            if (context?.previousSale) {
                utils.sales.getDaily.setData(
                    { outletId: outletId || "", date: new Date(date) },
                    context.previousSale
                );
            }
            toast.error(e.message);
        },
        onSettled: () => {
            utils.sales.list.invalidate();
            utils.sales.getDaily.invalidate();
        }
    });

    const createExpense = trpc.expenses.create.useMutation({
        onMutate: async (newExpense) => {
            const queryKey = { outletId: outletId || "", startDate: new Date(date), endDate: new Date(date) };
            await utils.expenses.list.cancel();
            const previousExpenses = utils.expenses.list.getData(queryKey);

            utils.expenses.list.setData(
                queryKey,
                (old) => {
                    if (!old) return [];
                    return [
                        {
                            id: `temp-${Date.now()}`,
                            ...newExpense,
                            date: new Date(newExpense.date),
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        } as any,
                        ...old
                    ];
                }
            );

            return { previousExpenses, queryKey };
        },
        onSuccess: () => {
            // Toast handled by loop or generic success
        },
        onError: (e, _newExpense, context) => {
            if (context?.previousExpenses && context?.queryKey) {
                utils.expenses.list.setData(context.queryKey, context.previousExpenses);
            }
            toast.error(`Expense failed: ${e.message}`);
        },
        onSettled: () => {
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
        setCashWithdrawal("");
        setClosingNote("");
        setOil("");
        setWaterCan("");
        setWaterBottle("");
        setMiscExpense("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const cash = Number(cashSale) || 0;
        const bank = Number(bankSale) || 0;
        const zomato = Number(zomatoSale) || 0;
        const swiggy = Number(swiggySale) || 0;

        if (cash + bank + zomato + swiggy === 0) {
            toast.error("Please enter at least one sale amount");
            return;
        }

        try {
            // Save sales entry
            await createSale.mutateAsync({
                outletId: outletId || "",
                date: new Date(date),
                cashSale: cash,
                bankSale: bank,
                swiggy: swiggy,
                zomato: zomato,
                swiggyPayout: 0,
                zomatoPayout: 0,
                cashInHand: Number(cashInHand) || 0,
                cashInBank: Number(cashInBank) || 0,
                cashWithdrawal: Number(cashWithdrawal) || 0
            });

            // Submit quick expenses if any
            const quickExpenses = [
                { category: "FUEL", amount: Number(oil) || 0, desc: "Oil" },
                { category: "SUPPLIES", amount: Number(waterCan) || 0, desc: "Water Can" },
                { category: "SUPPLIES", amount: Number(waterBottle) || 0, desc: "Water Bottle" },
                { category: "MISCELLANEOUS", amount: Number(miscExpense) || 0, desc: "Misc" },
            ];

            for (const expense of quickExpenses) {
                if (expense.amount > 0) {
                    await createExpense.mutateAsync({
                        outletId: outletId || "",
                        date: new Date(date),
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        category: expense.category as any,
                        amount: expense.amount,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        paymentMethod: "CASH" as any,
                        description: expense.desc,
                    });
                }
            }

        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to save";
            toast.error(message);
        }
    };

    // Calculations
    const cashBankTotal = (Number(cashSale) || 0) + (Number(bankSale) || 0);
    const totalSalesWithPlatforms = cashBankTotal + (Number(zomatoSale) || 0) + (Number(swiggySale) || 0);
    const quickExpensesTotal = (Number(oil) || 0) + (Number(waterCan) || 0) +
        (Number(waterBottle) || 0) + (Number(miscExpense) || 0);

    // Cash balance calculations
    const yesterdayClosing = yesterdaySale ? Number(yesterdaySale.cashInHand) : 0;
    const todayCashSale = Number(cashSale) || 0;
    const todayCashExpenses = todayExpenses?.reduce((sum, exp) =>
        exp.paymentMethod === "CASH" ? sum + Number(exp.amount) : sum, 0) || 0;
    const totalCashExpense = todayCashExpenses + quickExpensesTotal;
    const withdrawal = Number(cashWithdrawal) || 0;
    const expectedCashInHand = yesterdayClosing + todayCashSale - totalCashExpense - withdrawal;
    const enteredCashInHand = Number(cashInHand) || 0;
    const cashDifference = expectedCashInHand - enteredCashInHand;

    const formatCurrency = (amount: number) => {
        return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
        <div className="space-y-4 max-w-4xl mx-auto pb-10">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl sm:text-2xl">📊 Daily Sales & Closing</CardTitle>
                    <CardDescription className="text-sm">Complete daily sales entry and cash reconciliation</CardDescription>
                </CardHeader>
            </Card>

            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm ring-1 ring-gray-100">
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Date Selector with Navigation - Managers Only */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="date" className="text-base font-semibold">Date</Label>
                                {isStaff && (
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                                        <Lock className="h-3 w-3 mr-1" />
                                        Today Only
                                    </Badge>
                                )}
                            </div>
                            {isStaff ? (
                                // Staff: Locked to today
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 relative">
                                        <Input
                                            id="date"
                                            type="date"
                                            value={today}
                                            disabled
                                            className="h-12 text-base pl-10 bg-gray-50"
                                        />
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                                    </div>
                                    <div className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
                                        {new Date(today).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                    </div>
                                </div>
                            ) : (
                                // Manager: Full date navigation
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
                            )}
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
                                { id: "cashWithdrawal", label: "Cash Withdrawal", value: cashWithdrawal, setter: setCashWithdrawal },
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

                        <div className="grid gap-4 lg:grid-cols-2">
                            {/* Quick Cash Expenses */}
                            <Card className="bg-orange-50 border-orange-200">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base sm:text-lg text-slate-900">💰 Quick Cash Expenses</CardTitle>
                                    <CardDescription className="text-xs text-slate-600">Common daily expenses</CardDescription>
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

                            {/* Cash Balance Calculation */}
                            <Card className="bg-blue-50 border-blue-200">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg text-slate-900">💰 Cash Balance</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="bg-purple-50 p-2 rounded">
                                        <span className="text-xs font-bold text-purple-700">💼 Yesterday&apos;s Cash</span>
                                        <span className="font-bold text-base text-purple-600 float-right">{formatCurrency(yesterdayClosing)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-700">+ Today&apos;s Cash Sale</span>
                                        <span className="font-semibold text-green-600">+{formatCurrency(todayCashSale)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-700">- Cash Expenses</span>
                                        <span className="font-semibold text-red-600">-{formatCurrency(totalCashExpense)}</span>
                                    </div>
                                    {withdrawal > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-700">- Withdrawal</span>
                                            <span className="font-semibold text-orange-600">-{formatCurrency(withdrawal)}</span>
                                        </div>
                                    )}
                                    <div className="pt-2 border-t border-blue-300">
                                        <div className="flex justify-between items-center">
                                            <span className="text-base font-bold text-slate-900">Expected Cash</span>
                                            <span className="text-xl font-bold text-blue-600">{formatCurrency(expectedCashInHand)}</span>
                                        </div>
                                    </div>
                                    {cashInHand && (
                                        <div className="pt-2 border-t border-blue-300 mt-2">
                                            <div className="flex justify-between items-center mt-2 bg-yellow-50 p-2 rounded">
                                                <span className="text-sm font-bold">💸 Cash Check</span>
                                                <span className={`text-lg font-bold ${Math.abs(cashDifference) < 0.01
                                                    ? 'text-green-600'
                                                    : cashDifference > 0
                                                        ? 'text-red-600'
                                                        : 'text-blue-600'
                                                    }`}>
                                                    {formatCurrency(cashDifference)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-center mt-1 font-semibold">
                                                {Math.abs(cashDifference) < 0.01
                                                    ? '✅ Perfect! No money missing'
                                                    : cashDifference > 0
                                                        ? '⚠️ Money Missing'
                                                        : '💰 Surplus Money'}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sales Summary Card */}
                        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200 col-span-1 lg:col-span-2">
                            <CardContent className="pt-4">
                                <div className="space-y-2">
                                    <div className="text-xs font-bold text-green-700 mb-2">TODAY&apos;S SALES SUMMARY</div>
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
                                        💾 Save & Close Day
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
                                <li>Enter all sales and cash in hand for automatic reconciliation</li>
                                <li>Quick expenses are auto-saved as cash expenses</li>
                                <li>Cash check shows if money is missing or surplus</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div >
    );
}

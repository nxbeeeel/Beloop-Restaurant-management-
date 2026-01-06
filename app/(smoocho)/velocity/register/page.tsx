"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, AlertTriangle, Wallet, PlusCircle, ArrowRight, Receipt, DollarSign, Check, Clock, ArrowRightLeft, Lock, Vault } from "lucide-react";

/**
 * SMOOCHO Velocity - Daily Register Page
 * 
 * Features:
 * - Opening cash entry with comparison to yesterday
 * - Expense entry with category and photo upload
 * - End-of-day closing flow with variance calculation
 * - Skeleton loaders for all data fetching
 * - Optimistic updates on button clicks
 */

// Skeleton component for loading states
function Skeleton({ className = "" }: { className?: string }) {
    return (
        <div className={`animate-pulse rounded-lg bg-slate-700/50 ${className}`} />
    );
}

// Register Overview Skeleton
function RegisterSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-48 w-full" />
        </div>
    );
}

export default function RegisterPage() {
    const { user } = useUser();
    const [outletId, setOutletId] = useState<string | null>(null);
    const [openingCash, setOpeningCash] = useState("");
    const [isOpening, setIsOpening] = useState(false);

    // Expense form state
    const [expenseAmount, setExpenseAmount] = useState("");
    const [expenseCategory, setExpenseCategory] = useState("");
    const [expenseDescription, setExpenseDescription] = useState("");
    const [expenseOrderId, setExpenseOrderId] = useState("");
    const [expenseCustomerName, setExpenseCustomerName] = useState("");
    const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);

    // Closing form state
    const [closingDialogOpen, setClosingDialogOpen] = useState(false);
    const [closingStep, setClosingStep] = useState(1);
    const [cashSales, setCashSales] = useState("");
    const [upiSales, setUpiSales] = useState("");
    const [zomatoSales, setZomatoSales] = useState("");
    const [swiggySales, setSwiggySales] = useState("");
    const [actualCash, setActualCash] = useState("");
    const [varianceNote, setVarianceNote] = useState("");

    // Cash Drop state
    const [cashDropDialogOpen, setCashDropDialogOpen] = useState(false);
    const [cashDropAmount, setCashDropAmount] = useState("");
    const [managerPin, setManagerPin] = useState("");

    // Get outlet ID from user metadata
    useEffect(() => {
        if (user?.publicMetadata?.outletId) {
            setOutletId(user.publicMetadata.outletId as string);
        }
    }, [user]);

    // Fetch current register status
    const { data: registerData, isLoading, refetch } = api.velocity.getCurrentRegister.useQuery(
        { outletId: outletId! },
        { enabled: !!outletId }
    );

    // Fetch categories
    const { data: categories } = api.velocity.getCategories.useQuery(
        { outletId: outletId! },
        { enabled: !!outletId }
    );

    // Fetch wallet balances (for Cash Drop)
    const { data: wallets, refetch: refetchWallets } = api.velocity.getWallets.useQuery(
        { outletId: outletId! },
        { enabled: !!outletId }
    );

    // Mutations
    const openRegisterMutation = api.velocity.openRegister.useMutation({
        onMutate: () => setIsOpening(true),
        onSuccess: () => {
            toast.success("Register opened successfully!");
            refetch();
            setOpeningCash("");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to open register");
        },
        onSettled: () => setIsOpening(false),
    });

    const cashDropMutation = api.velocity.cashDrop.useMutation({
        onSuccess: (data) => {
            toast.success(data.message);
            setCashDropDialogOpen(false);
            setCashDropAmount("");
            setManagerPin("");
            refetch();
            refetchWallets();
        },
        onError: (error) => {
            toast.error(error.message || "Cash drop failed");
        },
    });

    const addTransactionMutation = api.velocity.addTransaction.useMutation({
        onSuccess: () => {
            toast.success("Expense added!");
            setExpenseDialogOpen(false);
            resetExpenseForm();
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "Failed to add expense");
        },
    });

    const closeRegisterMutation = api.velocity.closeRegister.useMutation({
        onSuccess: () => {
            toast.success("Register closed successfully!");
            setClosingDialogOpen(false);
            setClosingStep(1);
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "Failed to close register");
        },
    });

    const resetExpenseForm = () => {
        setExpenseAmount("");
        setExpenseCategory("");
        setExpenseDescription("");
        setExpenseOrderId("");
        setExpenseCustomerName("");
    };

    const handleOpenRegister = () => {
        if (!outletId || !openingCash) return;
        openRegisterMutation.mutate({
            outletId,
            openingCash: parseFloat(openingCash),
        });
    };

    const handleAddExpense = () => {
        if (!registerData?.current?.id || !expenseAmount || !expenseCategory) return;
        addTransactionMutation.mutate({
            registerId: registerData.current.id,
            amount: parseFloat(expenseAmount),
            type: "EXPENSE",
            paymentMode: "CASH",
            categoryId: expenseCategory,
            description: expenseDescription,
            orderId: expenseOrderId || undefined,
            customerName: expenseCustomerName || undefined,
        });
    };

    const handleCloseRegister = () => {
        if (!registerData?.current?.id || !actualCash) return;
        closeRegisterMutation.mutate({
            registerId: registerData.current.id,
            cashSales: parseFloat(cashSales) || 0,
            upiSales: parseFloat(upiSales) || 0,
            zomatoSales: parseFloat(zomatoSales) || 0,
            swiggySales: parseFloat(swiggySales) || 0,
            actualCash: parseFloat(actualCash),
            varianceNote: varianceNote || undefined,
        });
    };

    const handleCashDrop = () => {
        if (!outletId || !cashDropAmount || !managerPin) return;
        cashDropMutation.mutate({
            outletId,
            amount: parseFloat(cashDropAmount),
            pin: managerPin,
            reason: "Cash Drop to Manager"
        });
    };

    // Calculate expected cash and variance
    const calculateExpectedCash = () => {
        if (!registerData?.current) return 0;
        const opening = Number(registerData.current.openingCash);
        const sales = parseFloat(cashSales) || 0;
        const expenses = registerData.current.transactions
            .filter((t) => t.type === "EXPENSE" && t.paymentMode === "CASH")
            .reduce((sum, t) => sum + Number(t.amount), 0);
        return opening + sales - expenses;
    };

    const calculateVariance = () => {
        const expected = calculateExpectedCash();
        const actual = parseFloat(actualCash) || 0;
        return actual - expected;
    };

    // Selected category requires reference (e.g., Porter)
    const selectedCategoryRequiresRef = categories?.find(
        (c) => c.id === expenseCategory
    )?.requiresRef;

    // Loading state
    if (isLoading || !outletId) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">Daily Register</h2>
                <RegisterSkeleton />
            </div>
        );
    }

    // No register for today - show opening form
    if (!registerData?.current) {
        const yesterdayClosing = registerData?.yesterdayClosing;
        const openingVariance = yesterdayClosing && openingCash
            ? Math.abs(parseFloat(openingCash) - Number(yesterdayClosing))
            : 0;

        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">Open Today&apos;s Register</h2>

                <Card className="border-slate-700 bg-slate-800/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Wallet className="h-5 w-5 text-rose-400" />
                            Count the Cash in Drawer
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Enter the total cash amount currently in your drawer
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {yesterdayClosing && (
                            <div className="rounded-lg border border-slate-600 bg-slate-900/50 p-4">
                                <p className="text-sm text-slate-400">Yesterday&apos;s Closing Cash</p>
                                <p className="text-2xl font-bold text-white">
                                    ₹{Number(yesterdayClosing).toLocaleString("en-IN")}
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="openingCash" className="text-white">
                                Opening Cash Amount (₹)
                            </Label>
                            <Input
                                id="openingCash"
                                type="number"
                                placeholder="Enter amount"
                                value={openingCash}
                                onChange={(e) => setOpeningCash(e.target.value)}
                                className="h-16 border-slate-600 bg-slate-900 text-2xl text-white placeholder:text-slate-500"
                            />
                        </div>

                        {openingVariance > 10 && (
                            <div className="flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-amber-200">
                                <AlertTriangle className="h-5 w-5" />
                                <span>
                                    Warning: ₹{openingVariance.toLocaleString("en-IN")} difference from yesterday&apos;s closing
                                </span>
                            </div>
                        )}

                        <Button
                            onClick={handleOpenRegister}
                            disabled={!openingCash || isOpening}
                            className="h-14 w-full bg-gradient-to-r from-rose-500 to-orange-500 text-lg font-semibold hover:from-rose-600 hover:to-orange-600"
                        >
                            {isOpening ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <ArrowRight className="mr-2 h-5 w-5" />
                            )}
                            Open Register
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Register is open - show operations view
    const register = registerData.current;
    const isRegisterClosed = register.status === "CLOSED";

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                    {isRegisterClosed ? "Register Closed" : "Today's Register"}
                </h2>
                {!isRegisterClosed && (
                    <Dialog open={closingDialogOpen} onOpenChange={setClosingDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                className="border-rose-500/50 text-rose-400 hover:bg-rose-500/10"
                            >
                                <Clock className="mr-2 h-4 w-4" />
                                End of Day
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="border-slate-700 bg-slate-800 text-white sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Close Register</DialogTitle>
                                <DialogDescription className="text-slate-400">
                                    Step {closingStep} of 3
                                </DialogDescription>
                            </DialogHeader>

                            {closingStep === 1 && (
                                <div className="space-y-4">
                                    <Label className="text-white">Enter Sales Breakdown</Label>
                                    <div className="grid gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-400">Cash Sales (₹)</Label>
                                            <Input
                                                type="number"
                                                value={cashSales}
                                                onChange={(e) => setCashSales(e.target.value)}
                                                className="border-slate-600 bg-slate-900"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-400">UPI Sales (₹)</Label>
                                            <Input
                                                type="number"
                                                value={upiSales}
                                                onChange={(e) => setUpiSales(e.target.value)}
                                                className="border-slate-600 bg-slate-900"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-400">Zomato Sales (₹)</Label>
                                            <Input
                                                type="number"
                                                value={zomatoSales}
                                                onChange={(e) => setZomatoSales(e.target.value)}
                                                className="border-slate-600 bg-slate-900"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-400">Swiggy Sales (₹)</Label>
                                            <Input
                                                type="number"
                                                value={swiggySales}
                                                onChange={(e) => setSwiggySales(e.target.value)}
                                                className="border-slate-600 bg-slate-900"
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => setClosingStep(2)}
                                        className="w-full"
                                    >
                                        Next <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            )}

                            {closingStep === 2 && (
                                <div className="space-y-4">
                                    <div className="rounded-lg border border-slate-600 bg-slate-900 p-4">
                                        <p className="text-sm text-slate-400">Expected Cash</p>
                                        <p className="text-3xl font-bold text-white">
                                            ₹{calculateExpectedCash().toLocaleString("en-IN")}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-white">Physical Cash Count (₹)</Label>
                                        <Input
                                            type="number"
                                            value={actualCash}
                                            onChange={(e) => setActualCash(e.target.value)}
                                            className="h-14 border-slate-600 bg-slate-900 text-xl"
                                            placeholder="Count money in drawer"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => setClosingStep(1)}
                                            className="flex-1 border-slate-600"
                                        >
                                            Back
                                        </Button>
                                        <Button
                                            onClick={() => setClosingStep(3)}
                                            disabled={!actualCash}
                                            className="flex-1"
                                        >
                                            Next <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {closingStep === 3 && (
                                <div className="space-y-4">
                                    <div className="rounded-lg border border-slate-600 bg-slate-900 p-4">
                                        <p className="text-sm text-slate-400">Variance</p>
                                        <p className={`text-3xl font-bold ${Math.abs(calculateVariance()) > 10
                                            ? "text-amber-400"
                                            : "text-emerald-400"
                                            }`}>
                                            ₹{calculateVariance().toLocaleString("en-IN")}
                                        </p>
                                    </div>

                                    {Math.abs(calculateVariance()) > 10 && (
                                        <div className="space-y-2">
                                            <Label className="text-amber-400">
                                                Reason for Variance (Required)
                                            </Label>
                                            <Input
                                                value={varianceNote}
                                                onChange={(e) => setVarianceNote(e.target.value)}
                                                className="border-amber-500/50 bg-slate-900"
                                                placeholder="Explain the variance..."
                                            />
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => setClosingStep(2)}
                                            className="flex-1 border-slate-600"
                                        >
                                            Back
                                        </Button>
                                        <Button
                                            onClick={handleCloseRegister}
                                            disabled={
                                                closeRegisterMutation.isPending ||
                                                (Math.abs(calculateVariance()) > 10 && !varianceNote)
                                            }
                                            className="flex-1 bg-rose-500 hover:bg-rose-600"
                                        >
                                            {closeRegisterMutation.isPending ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Check className="mr-2 h-4 w-4" />
                                            )}
                                            Close Register
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-slate-700 bg-slate-800/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20">
                                <Wallet className="h-6 w-6 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Opening Cash</p>
                                <p className="text-2xl font-bold text-white">
                                    ₹{Number(register.openingCash).toLocaleString("en-IN")}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-700 bg-slate-800/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/20">
                                <Receipt className="h-6 w-6 text-rose-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Expenses Today</p>
                                <p className="text-2xl font-bold text-white">
                                    ₹{register.transactions
                                        .filter((t) => t.type === "EXPENSE")
                                        .reduce((sum, t) => sum + Number(t.amount), 0)
                                        .toLocaleString("en-IN")}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-700 bg-slate-800/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20">
                                <DollarSign className="h-6 w-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Transactions</p>
                                <p className="text-2xl font-bold text-white">
                                    {register.transactions.length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Add Expense Button */}
            {!isRegisterClosed && (
                <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            className="h-14 w-full bg-gradient-to-r from-rose-500 to-orange-500 text-lg font-semibold hover:from-rose-600 hover:to-orange-600"
                        >
                            <PlusCircle className="mr-2 h-5 w-5" />
                            Pay Cash Expense
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="border-slate-700 bg-slate-800 text-white">
                        <DialogHeader>
                            <DialogTitle>Add Expense</DialogTitle>
                            <DialogDescription className="text-slate-400">
                                Record a cash expense
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-white">Category</Label>
                                <Select
                                    value={expenseCategory}
                                    onValueChange={setExpenseCategory}
                                >
                                    <SelectTrigger className="border-slate-600 bg-slate-900">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent className="border-slate-700 bg-slate-800">
                                        {categories?.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-white">Amount (₹)</Label>
                                <Input
                                    type="number"
                                    value={expenseAmount}
                                    onChange={(e) => setExpenseAmount(e.target.value)}
                                    className="h-14 border-slate-600 bg-slate-900 text-xl"
                                    placeholder="0"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-white">Description (Optional)</Label>
                                <Input
                                    value={expenseDescription}
                                    onChange={(e) => setExpenseDescription(e.target.value)}
                                    className="border-slate-600 bg-slate-900"
                                    placeholder="What was this expense for?"
                                />
                            </div>

                            {selectedCategoryRequiresRef && (
                                <>
                                    <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-200">
                                        <AlertTriangle className="mr-2 inline h-4 w-4" />
                                        This category requires Order ID or Customer Name
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label className="text-white">Order ID</Label>
                                            <Input
                                                value={expenseOrderId}
                                                onChange={(e) => setExpenseOrderId(e.target.value)}
                                                className="border-slate-600 bg-slate-900"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-white">Customer Name</Label>
                                            <Input
                                                value={expenseCustomerName}
                                                onChange={(e) => setExpenseCustomerName(e.target.value)}
                                                className="border-slate-600 bg-slate-900"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <Button
                                onClick={handleAddExpense}
                                disabled={
                                    !expenseAmount ||
                                    !expenseCategory ||
                                    addTransactionMutation.isPending ||
                                    (selectedCategoryRequiresRef && !expenseOrderId && !expenseCustomerName)
                                }
                                className="h-12 w-full bg-rose-500 hover:bg-rose-600"
                            >
                                {addTransactionMutation.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                )}
                                Add Expense
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* Cash Drop Button - Handover to Manager */}
            {!isRegisterClosed && (
                <Dialog open={cashDropDialogOpen} onOpenChange={setCashDropDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            variant="outline"
                            className="h-14 w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                        >
                            <ArrowRightLeft className="mr-2 h-5 w-5" />
                            Handover Cash to Manager
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="border-slate-700 bg-slate-800 text-white">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Vault className="h-5 w-5 text-amber-400" />
                                Cash Drop to Manager Safe
                            </DialogTitle>
                            <DialogDescription className="text-slate-400">
                                Transfer excess cash to manager&apos;s holding account (not an expense)
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            {/* Manager Safe Balance */}
                            {wallets && (
                                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                                    <p className="text-sm text-amber-200">Manager Safe Balance</p>
                                    <p className="text-2xl font-bold text-white">
                                        ₹{wallets.managerSafe.balance.toLocaleString("en-IN")}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-white">Amount to Transfer (₹)</Label>
                                <Input
                                    type="number"
                                    value={cashDropAmount}
                                    onChange={(e) => setCashDropAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    className="h-14 border-slate-600 bg-slate-900 text-xl"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-white">
                                    <Lock className="h-4 w-4 text-amber-400" />
                                    Manager PIN (Required)
                                </Label>
                                <Input
                                    type="password"
                                    maxLength={4}
                                    value={managerPin}
                                    onChange={(e) => setManagerPin(e.target.value.replace(/\D/g, ""))}
                                    placeholder="Enter 4-digit PIN"
                                    className="h-14 border-slate-600 bg-slate-900 text-center text-2xl tracking-widest"
                                />
                                <p className="text-xs text-slate-400">
                                    Manager must enter their PIN to authorize this transfer
                                </p>
                            </div>

                            <Button
                                onClick={handleCashDrop}
                                disabled={
                                    !cashDropAmount ||
                                    managerPin.length !== 4 ||
                                    cashDropMutation.isPending
                                }
                                className="h-12 w-full bg-amber-500 hover:bg-amber-600"
                            >
                                {cashDropMutation.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                                )}
                                Confirm Cash Drop
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* Transactions List */}
            <Card className="border-slate-700 bg-slate-800/50">
                <CardHeader>
                    <CardTitle className="text-white">Today&apos;s Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    {register.transactions.length === 0 ? (
                        <div className="py-8 text-center text-slate-400">
                            No transactions yet today
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {register.transactions.map((txn) => (
                                <div
                                    key={txn.id}
                                    className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 p-4"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${txn.type === "EXPENSE"
                                            ? "bg-rose-500/20 text-rose-400"
                                            : "bg-emerald-500/20 text-emerald-400"
                                            }`}>
                                            {txn.type === "EXPENSE" ? (
                                                <Receipt className="h-5 w-5" />
                                            ) : (
                                                <DollarSign className="h-5 w-5" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">
                                                {txn.category?.name || txn.type}
                                            </p>
                                            <p className="text-sm text-slate-400">
                                                {txn.description || txn.paymentMode}
                                            </p>
                                        </div>
                                    </div>
                                    <p className={`text-lg font-bold ${txn.type === "EXPENSE" ? "text-rose-400" : "text-emerald-400"
                                        }`}>
                                        {txn.type === "EXPENSE" ? "-" : "+"}₹{Number(txn.amount).toLocaleString("en-IN")}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Closed Register Summary */}
            {isRegisterClosed && (
                <Card className="border-emerald-500/30 bg-emerald-500/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-emerald-400">
                            <Check className="h-5 w-5" />
                            Register Closed
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-4">
                            <div>
                                <p className="text-sm text-slate-400">Cash Sales</p>
                                <p className="text-xl font-bold text-white">
                                    ₹{Number(register.cashSales).toLocaleString("en-IN")}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">UPI Sales</p>
                                <p className="text-xl font-bold text-white">
                                    ₹{Number(register.upiSales).toLocaleString("en-IN")}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Actual Cash</p>
                                <p className="text-xl font-bold text-white">
                                    ₹{Number(register.actualCash).toLocaleString("en-IN")}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Variance</p>
                                <p className={`text-xl font-bold ${Math.abs(Number(register.variance)) > 10
                                    ? "text-amber-400"
                                    : "text-emerald-400"
                                    }`}>
                                    ₹{Number(register.variance).toLocaleString("en-IN")}
                                </p>
                            </div>
                        </div>
                        {register.varianceNote && (
                            <div className="mt-4 rounded-lg bg-slate-800/50 p-3">
                                <p className="text-sm text-slate-400">Variance Note:</p>
                                <p className="text-white">{register.varianceNote}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Calendar, Save, Receipt, ChevronLeft, ChevronRight, Wallet, Building2 } from "lucide-react";

export default function ExpenseEntryForm({ outletId }: { outletId: string }) {
    const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [activeTab, setActiveTab] = useState<string>("fruits");
    const [category, setCategory] = useState<string>("");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<string>("CASH");

    // Fetch tenant settings for dynamic categories
    const { data: tenantSettings } = trpc.tenant.getSettings.useQuery();

    const utils = trpc.useUtils();
    const createExpense = trpc.expenses.create.useMutation({
        onSuccess: () => {
            toast.success("Expense recorded successfully!");
            // Reset form
            setAmount("");
            setDescription("");
            setCategory("");
            setActiveTab("fruits");
            // Refresh the expenses list
            utils.expenses.list.invalidate();
        },
        onError: (e) => toast.error(e.message)
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

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        setCategory("");
        setAmount("");
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const amountNum = Number(amount);
        if (!amountNum || amountNum <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        if (!category) {
            toast.error("Please select a category");
            return;
        }

        createExpense.mutate({
            outletId,
            date: new Date(date),
            category: category,
            amount: amountNum,
            description: description || undefined,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            paymentMethod: paymentMethod as any,
        });
    };

    const totalAmount = Number(amount) || 0;

    // Use dynamic categories or fallback to defaults if loading/empty
    const fruitCategories = tenantSettings?.fruitCategories as string[] || ["FRUITS", "VEGETABLES", "DAIRY"];
    const expenseCategories = tenantSettings?.expenseCategories as string[] || ["PACKAGING", "FUEL", "SALARY", "RENT"];

    return (
        <div className="space-y-4">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm ring-1 ring-gray-100">
                <CardHeader className="pb-4 border-b border-gray-100">
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl text-primary">
                        <Receipt className="h-5 w-5" />
                        <span>Record New Expense</span>
                    </CardTitle>
                    <CardDescription>Quick expense entry with category tabs</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Date and Payment Method Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Date Selector with Navigation */}
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Expense Date</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        onClick={handlePreviousDay}
                                        variant="outline"
                                        size="icon"
                                        className="h-11 w-11"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </Button>

                                    <div className="flex-1 relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                        <Input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            max={new Date().toISOString().split("T")[0]}
                                            className="pl-10 h-11 bg-gray-50/50 border-gray-200"
                                        />
                                    </div>

                                    <Button
                                        type="button"
                                        onClick={handleNextDay}
                                        variant="outline"
                                        size="icon"
                                        className="h-11 w-11"
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </Button>

                                    <Button
                                        type="button"
                                        onClick={handleToday}
                                        variant="secondary"
                                        className="h-11 px-3 text-xs font-bold"
                                    >
                                        Today
                                    </Button>
                                </div>
                            </div>

                            {/* Payment Method - Enhanced Buttons */}
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Payment Method</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        type="button"
                                        variant={paymentMethod === "CASH" ? "default" : "outline"}
                                        onClick={() => setPaymentMethod("CASH")}
                                        className={`h-12 text-base font-semibold transition-all ${paymentMethod === "CASH"
                                            ? "shadow-lg scale-105"
                                            : "bg-background/60"
                                            }`}
                                    >
                                        <Wallet className="h-5 w-5 mr-2" />
                                        Cash
                                        {paymentMethod === "CASH" && <span className="ml-2">✓</span>}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={paymentMethod === "BANK" ? "default" : "outline"}
                                        onClick={() => setPaymentMethod("BANK")}
                                        className={`h-12 text-base font-semibold transition-all ${paymentMethod === "BANK"
                                            ? "shadow-lg scale-105"
                                            : "bg-background/60"
                                            }`}
                                    >
                                        <Building2 className="h-5 w-5 mr-2" />
                                        Bank
                                        {paymentMethod === "BANK" && <span className="ml-2">✓</span>}
                                    </Button>
                                </div>
                                <p className="text-xs text-center text-muted-foreground">
                                    Selected: <span className="font-bold capitalize">{paymentMethod.toLowerCase()}</span>
                                </p>
                            </div>
                        </div>

                        {/* Category Selection - Tabs */}
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold">Category</Label>
                            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                                <TabsList className="w-full h-12 grid grid-cols-2">
                                    <TabsTrigger value="fruits" className="text-sm font-semibold">
                                        🍓 Fruits & Food
                                    </TabsTrigger>
                                    <TabsTrigger value="others" className="text-sm font-semibold">
                                        📦 Other Expenses
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="fruits" className="mt-4">
                                    <Select value={category} onValueChange={setCategory}>
                                        <SelectTrigger className="h-11 bg-white border-gray-200">
                                            <SelectValue placeholder="Select fruit/food category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {fruitCategories.map((cat) => (
                                                <SelectItem key={cat} value={cat}>
                                                    {cat.replace(/_/g, " ")}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TabsContent>

                                <TabsContent value="others" className="mt-4">
                                    <Select value={category} onValueChange={setCategory}>
                                        <SelectTrigger className="h-11 bg-white border-gray-200">
                                            <SelectValue placeholder="Select expense category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {expenseCategories.map((cat) => (
                                                <SelectItem key={cat} value={cat}>
                                                    {cat.replace(/_/g, " ")}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TabsContent>
                            </Tabs>
                        </div>

                        {/* Amount Input - Shows when category is selected */}
                        {category && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <Label htmlFor="amount" className="text-sm font-semibold">
                                    Amount for <span className="text-primary">{category.replace(/_/g, " ")}</span> (₹)
                                </Label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 font-bold text-xl">₹</span>
                                    <Input
                                        id="amount"
                                        type="number"
                                        step="0.01"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="pl-10 h-14 text-xl font-bold text-center bg-white border-gray-200 shadow-sm"
                                        autoFocus
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        {category && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <Label className="text-sm font-medium text-gray-700">
                                    Description (Optional)
                                </Label>
                                <Input
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Add notes about this expense..."
                                    className="h-11 bg-white border-gray-200"
                                />
                            </div>
                        )}

                        {/* Summary Card */}
                        {category && amount && totalAmount > 0 && (
                            <Card className="bg-primary/10 border-primary/20 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <CardContent className="pt-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Category:</span>
                                            <span className="font-semibold">{category.replace(/_/g, " ")}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Payment:</span>
                                            <span className="font-semibold capitalize">{paymentMethod.toLowerCase()}</span>
                                        </div>
                                        <div className="flex justify-between text-base pt-2 border-t border-primary/20">
                                            <span className="font-semibold">Total:</span>
                                            <span className="text-xl font-bold text-primary">
                                                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full h-14 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                            disabled={createExpense.isPending || !category || !amount}
                        >
                            {createExpense.isPending ? (
                                <>⏳ Saving...</>
                            ) : (
                                <>
                                    <Save className="h-5 w-5 mr-2" />
                                    💾 Save Expense
                                </>
                            )}
                        </Button>
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
                                <li>Use tabs to switch between Fruits/Food and Other expenses</li>
                                <li>Navigate dates with arrow buttons or select manually</li>
                                <li>Summary shows before you save</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

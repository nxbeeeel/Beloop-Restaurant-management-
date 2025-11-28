"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, ChevronRight, ChevronLeft, CheckCircle2, Keyboard } from "lucide-react";
import { useKeyboardShortcuts, commonShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ShortcutsHelpModal } from "@/components/ui/ShortcutsHelpModal";
import { toast } from "sonner";

// Schema for the form
const expenseSchema = z.object({
    category: z.enum([
        "FRUITS", "VEGETABLES", "DAIRY", "PACKAGING", "FUEL", "SALARY", "RENT",
        "UTILITIES", "MARKETING", "EQUIPMENT", "MAINTENANCE", "INSURANCE",
        "TAXES", "LICENSES", "SUPPLIES", "TRANSPORT", "PROFESSIONAL_FEES",
        "BANK_CHARGES", "ENTERTAINMENT", "TRAVEL", "MISCELLANEOUS", "OTHER"
    ]),
    amount: z.number().min(0, "Amount must be positive"),
    paymentMethod: z.enum(["CASH", "BANK"]),
    description: z.string().optional(),
});

const submissionSchema = z.object({
    date: z.string(), // YYYY-MM-DD
    cashSale: z.number().min(0),
    bankSale: z.number().min(0),
    swiggy: z.number().min(0),
    zomato: z.number().min(0),
    swiggyPayout: z.number().min(0),
    zomatoPayout: z.number().min(0),
    otherOnline: z.number().min(0),
    otherOnlinePayout: z.number().min(0),
    cashInHand: z.number().min(0),
    cashInBank: z.number().min(0),
    cashWithdrawal: z.number().min(0),
    expenses: z.array(expenseSchema).optional(),
    stockCheck: z.array(z.object({
        productId: z.string(),
        productName: z.string().optional(), // Helper for UI
        unit: z.string().optional(), // Helper for UI
        countedQty: z.number().min(0)
    })).optional(),
});

type SubmissionFormValues = z.infer<typeof submissionSchema>;

export function DailySubmissionForm({ outletId }: { outletId: string }) {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
    const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
    const [allowOverwrite, setAllowOverwrite] = useState(false);

    // Fetch products for stock check
    const { data: products } = trpc.products.list.useQuery({ outletId });
    const createCheck = trpc.inventory.submitCheck.useMutation();

    // Fetch tenant settings for custom expense categories
    const { data: tenantSettings } = trpc.tenant.getSettings.useQuery();
    const expenseCategories = tenantSettings?.expenseCategories || [
        'Rent', 'Staff Salary', 'Bake', 'Fruits', 'Packaging', 'Fuel',
        'Utilities', 'Marketing', 'Maintenance', 'Other'
    ];

    // Check for duplicates
    const selectedDate = form.watch("date");
    const checkDuplicate = trpc.sales.checkDuplicate.useQuery(
        {
            outletId,
            date: selectedDate ? new Date(selectedDate) : new Date(),
        },
        {
            enabled: !!outletId && !!selectedDate && step === 4 && !allowOverwrite,
        }
    );

    const form = useForm<SubmissionFormValues>({
        resolver: zodResolver(submissionSchema),
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            cashSale: 0,
            bankSale: 0,
            swiggy: 0,
            zomato: 0,
            swiggyPayout: 0,
            zomatoPayout: 0,
            otherOnline: 0,
            otherOnlinePayout: 0,
            cashInHand: 0,
            cashInBank: 0,
            cashWithdrawal: 0,
            expenses: [],
            stockCheck: []
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "expenses",
    });

    // Initialize stock check fields when products are loaded
    const { fields: stockFields, replace: replaceStock } = useFieldArray({
        control: form.control,
        name: "stockCheck"
    });

    // Populate fields when step 3 is active and products are loaded
    useEffect(() => {
        if (step === 3 && products && stockFields.length === 0) {
            replaceStock(products.map(p => ({
                productId: p.id,
                productName: p.name,
                unit: p.unit,
                countedQty: p.currentStock
            })));
        }
    }, [step, products, replaceStock, stockFields.length]);

    const createSale = trpc.sales.create.useMutation();
    const createExpense = trpc.expenses.create.useMutation();

    // Keyboard shortcuts
    useKeyboardShortcuts({
        shortcuts: [
            commonShortcuts.save(() => {
                if (step === 4) {
                    form.handleSubmit(onSubmit)();
                }
            }),
            commonShortcuts.help(() => setShowShortcutsHelp(true)),
            commonShortcuts.escape(() => {
                if (showShortcutsHelp) setShowShortcutsHelp(false);
                else if (showDuplicateWarning) setShowDuplicateWarning(false);
                else if (step > 1) prevStep();
            }),
        ],
        enabled: !isSubmitting,
    });

    const onSubmit = async (data: SubmissionFormValues) => {
        // Check for duplicates before submitting
        if (checkDuplicate.data?.exists && !allowOverwrite) {
            setShowDuplicateWarning(true);
            return;
        }

        setIsSubmitting(true);
        try {
            const date = new Date(data.date);

            // 1. Submit Sales
            await createSale.mutateAsync({
                outletId,
                date,
                cashSale: data.cashSale,
                bankSale: data.bankSale,
                swiggy: data.swiggy,
                zomato: data.zomato,
                swiggyPayout: data.swiggyPayout,
                zomatoPayout: data.zomatoPayout,
                otherOnline: data.otherOnline || 0,
                otherOnlinePayout: data.otherOnlinePayout || 0,
                cashInHand: data.cashInHand,
                cashInBank: data.cashInBank,
                cashWithdrawal: data.cashWithdrawal,
            });

            // 2. Submit Expenses
            if (data.expenses && data.expenses.length > 0) {
                for (const expense of data.expenses) {
                    await createExpense.mutateAsync({
                        outletId,
                        date,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        category: expense.category as any,
                        amount: expense.amount,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        paymentMethod: expense.paymentMethod as any,
                        description: expense.description,
                    });
                }
            }

            // 3. Submit Stock Check
            if (data.stockCheck && data.stockCheck.length > 0) {
                await createCheck.mutateAsync({
                    outletId,
                    items: data.stockCheck.map(item => ({
                        productId: item.productId,
                        countedQty: item.countedQty
                    })),
                    notes: "Daily Closing Check"
                });
            }

            toast.success("Daily submission completed successfully!");
            router.push("/submit/success");
        } catch (error) {
            console.error("Submission failed", error);
            toast.error("Failed to submit data. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOverwrite = () => {
        setAllowOverwrite(true);
        setShowDuplicateWarning(false);
        // Trigger submission after allowing overwrite
        setTimeout(() => form.handleSubmit(onSubmit)(), 100);
    };

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const totalSales = (form.watch("cashSale") || 0) + (form.watch("bankSale") || 0) + (form.watch("swiggy") || 0) + (form.watch("zomato") || 0) + (form.watch("otherOnline") || 0);
    const totalExpenses = fields.reduce((acc, field, index) => acc + (form.watch(`expenses.${index}.amount`) || 0), 0);

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Progress Steps */}
            <div className="flex justify-between items-center px-8">
                {[1, 2, 3, 4].map((s) => (
                    <div key={s} className="flex flex-col items-center gap-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            }`}>
                            {step > s ? <CheckCircle2 className="w-6 h-6" /> : s}
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                            {s === 1 ? "Sales" : s === 2 ? "Expenses" : s === 3 ? "Stock" : "Review"}
                        </span>
                    </div>
                ))}
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)}>
                {step === 1 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Daily Sales Entry</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Date</Label>
                                    <Input type="date" {...form.register("date")} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Revenue Sources</h3>
                                    <div className="space-y-2">
                                        <Label>Cash Sale</Label>
                                        <Input type="number" step="0.01" {...form.register("cashSale", { valueAsNumber: true })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Bank/UPI Sale</Label>
                                        <Input type="number" step="0.01" {...form.register("bankSale", { valueAsNumber: true })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Swiggy Sale</Label>
                                        <Input type="number" step="0.01" {...form.register("swiggy", { valueAsNumber: true })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Zomato Sale</Label>
                                        <Input type="number" step="0.01" {...form.register("zomato", { valueAsNumber: true })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Other Online Sale</Label>
                                        <Input type="number" step="0.01" {...form.register("otherOnline", { valueAsNumber: true })} placeholder="Uber Eats, Dunzo, etc." />
                                    </div>
                                </div>

                                <div className="space-y-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Payouts & Cash</h3>
                                    <div className="space-y-2">
                                        <Label>Swiggy Payout</Label>
                                        <Input type="number" step="0.01" {...form.register("swiggyPayout", { valueAsNumber: true })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Zomato Payout</Label>
                                        <Input type="number" step="0.01" {...form.register("zomatoPayout", { valueAsNumber: true })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Other Online Payout</Label>
                                        <Input type="number" step="0.01" {...form.register("otherOnlinePayout", { valueAsNumber: true })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Cash In Hand (Closing)</Label>
                                        <Input type="number" step="0.01" {...form.register("cashInHand", { valueAsNumber: true })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Cash Deposited to Bank</Label>
                                        <Input type="number" step="0.01" {...form.register("cashInBank", { valueAsNumber: true })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Cash Withdrawal</Label>
                                        <Input type="number" step="0.01" {...form.register("cashWithdrawal", { valueAsNumber: true })} />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 flex justify-between items-center">
                                <span className="font-semibold">Total Sales Calculated:</span>
                                <span className="text-2xl font-bold text-primary">₹{totalSales.toFixed(2)}</span>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {step === 2 && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Daily Expenses</CardTitle>
                            <Button type="button" size="sm" onClick={() => append({ category: "OTHER", amount: 0, paymentMethod: "CASH", description: "" })}>
                                <Plus className="w-4 h-4 mr-2" /> Add Expense
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50 relative group">
                                    <div className="md:col-span-3 space-y-2">
                                        <Label>Category</Label>
                                        <Select
                                            value={form.watch(`expenses.${index}.category`)}
                                            onValueChange={(val) => form.setValue(`expenses.${index}.category`, val as any)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {expenseCategories.map(category => (
                                                    <SelectItem key={category} value={category}>
                                                        {category}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <Label>Amount</Label>
                                        <Input type="number" step="0.01" {...form.register(`expenses.${index}.amount`, { valueAsNumber: true })} />
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <Label>Paid Via</Label>
                                        <Select
                                            value={form.watch(`expenses.${index}.paymentMethod`)}
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            onValueChange={(val) => form.setValue(`expenses.${index}.paymentMethod`, val as any)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select method" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="CASH">Cash</SelectItem>
                                                <SelectItem value="BANK">Bank</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="md:col-span-4 space-y-2">
                                        <Label>Description</Label>
                                        <Input {...form.register(`expenses.${index}.description`)} placeholder="Optional note" />
                                    </div>
                                    <div className="md:col-span-1 flex justify-end pb-2">
                                        <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => remove(index)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            {fields.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                                    No expenses added yet.
                                </div>
                            )}

                            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 flex justify-between items-center">
                                <span className="font-semibold text-orange-800 dark:text-orange-200">Total Expenses:</span>
                                <span className="text-2xl font-bold text-orange-700 dark:text-orange-300">₹{totalExpenses.toFixed(2)}</span>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {step === 3 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Stock Check</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-12 gap-4 font-semibold text-sm text-muted-foreground border-b pb-2">
                                <div className="col-span-6">Product</div>
                                <div className="col-span-6">Counted Qty</div>
                            </div>

                            {stockFields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-6">
                                        <p className="font-medium">{field.productName}</p>
                                        <p className="text-xs text-muted-foreground">{field.unit}</p>
                                        <input type="hidden" {...form.register(`stockCheck.${index}.productId`)} />
                                    </div>
                                    <div className="col-span-6">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            {...form.register(`stockCheck.${index}.countedQty`, { valueAsNumber: true })}
                                        />
                                    </div>
                                </div>
                            ))}

                            {stockFields.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground">
                                    No products found for this outlet.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {step === 4 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Review & Submit</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="font-semibold border-b pb-2">Sales Summary</h3>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Date:</span>
                                        <span className="font-medium">{form.getValues("date")}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Total Revenue:</span>
                                        <span className="font-bold text-green-600">₹{totalSales.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Cash In Hand:</span>
                                        <span className="font-medium">₹{form.getValues("cashInHand")}</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-semibold border-b pb-2">Expense Summary</h3>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Total Items:</span>
                                        <span className="font-medium">{fields.length}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Total Amount:</span>
                                        <span className="font-bold text-orange-600">₹{totalExpenses.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="space-y-4 md:col-span-2">
                                    <h3 className="font-semibold border-b pb-2">Stock Check Summary</h3>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Items Counted:</span>
                                        <span className="font-medium">{stockFields.length}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t">
                                <div className="flex justify-between items-center p-6 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Net Profit (Est.)</p>
                                        <p className="text-3xl font-bold text-primary">₹{(totalSales - totalExpenses).toFixed(2)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground">Please verify all numbers before submitting.</p>
                                        <p className="text-xs text-muted-foreground">This action cannot be undone easily.</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="flex justify-between mt-8">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={prevStep}
                        disabled={step === 1 || isSubmitting}
                    >
                        <ChevronLeft className="w-4 h-4 mr-2" /> Back
                    </Button>

                    {step < 4 ? (
                        <Button type="button" onClick={nextStep}>
                            Next <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    ) : (
                        <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Submit Report
                        </Button>
                    )}
                </div>

                {/* Keyboard Shortcuts Help Button */}
                <div className="fixed bottom-4 right-4">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowShortcutsHelp(true)}
                        title="Keyboard Shortcuts (Ctrl+?)"
                    >
                        <Keyboard className="h-4 w-4" />
                    </Button>
                </div>
            </form>

            {/* Duplicate Warning Modal */}
            <AlertDialog open={showDuplicateWarning} onOpenChange={setShowDuplicateWarning}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>⚠️ Duplicate Entry Detected</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                            <p>A daily submission already exists for this outlet and date.</p>
                            {checkDuplicate.data?.data && (
                                <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
                                    <p><strong>Submitted by:</strong> {checkDuplicate.data.data.staff?.name}</p>
                                    <p><strong>Total Sale:</strong> ₹{checkDuplicate.data.data.totalSale?.toString()}</p>
                                    <p><strong>Created:</strong> {new Date(checkDuplicate.data.data.createdAt).toLocaleString()}</p>
                                </div>
                            )}
                            <p className="text-destructive font-medium">
                                Do you want to overwrite the existing entry?
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleOverwrite} className="bg-destructive hover:bg-destructive/90">
                            Overwrite
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Shortcuts Help Modal */}
            <ShortcutsHelpModal open={showShortcutsHelp} onOpenChange={setShowShortcutsHelp} />
        </div>
    );
}

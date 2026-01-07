"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const formSchema = z.object({
    type: z.enum(["EXPENSE", "PAYOUT", "MANUAL"]),
    category: z.string().optional(),
    amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
    paymentMode: z.enum(["CASH", "UPI", "CARD", "ONLINE"]),
    description: z.string().min(3, "Description required"),
    vendorName: z.string().optional(),
    proofImageUrl: z.string().optional(),
});

interface AddTransactionDialogProps {
    registerId: string;
    outletId: string;
    onSuccess: () => void;
}

export function AddTransactionDialog({ registerId, outletId, onSuccess }: AddTransactionDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    // Fetch expense categories
    const { data: categories } = trpc.expensesV2.getCategories.useQuery({
        // @ts-ignore - Assuming getCategories supports input but might be inferred as void if no input defined
        includeInactive: false
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            type: "EXPENSE",
            amount: 0,
            paymentMode: "CASH",
            description: "",
            vendorName: "",
        },
    });

    const addTransactionMutation = trpc.dailyRegister.addTransaction.useMutation({
        onSuccess: () => {
            toast({ title: "Transaction Added", description: "Record has been saved successfully." });
            setOpen(false);
            form.reset();
            onSuccess();
        },
        onError: (err) => {
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive"
            });
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        await addTransactionMutation.mutateAsync({
            registerId,
            type: values.type,
            category: values.category,
            amount: values.amount,
            isInflow: false, // Currently only supporting outflows here. Inflows usually properly automated via Sales.
            paymentMode: values.paymentMode,
            description: values.description,
            vendorName: values.vendorName,
            proofImageUrl: values.proofImageUrl,
        });
    }

    const type = form.watch("type");

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Transaction
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Transaction</DialogTitle>
                    <DialogDescription>
                        Manually record an expense or payout initiated from the register.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="EXPENSE">Expense</SelectItem>
                                                <SelectItem value="PAYOUT">Payout</SelectItem>
                                                <SelectItem value="MANUAL">Other Adjustment</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="paymentMode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Payment Mode</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select mode" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="CASH">Cash</SelectItem>
                                                <SelectItem value="UPI">UPI</SelectItem>
                                                <SelectItem value="CARD">Card</SelectItem>
                                                <SelectItem value="ONLINE">Bank Transfer</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {type === "EXPENSE" && (
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {categories?.map((cat) => (
                                                    <SelectItem key={cat.id} value={cat.name}>
                                                        {cat.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount (₹)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Details about this transaction..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="vendorName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Vendor / Recipient Name (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="E.g. Supplier Name or Staff Name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={addTransactionMutation.isPending}>
                                {addTransactionMutation.isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Add Transaction
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

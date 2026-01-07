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
import { Wallet } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { PinVerificationModal } from "@/components/security/PinVerificationModal";

const formSchema = z.object({
    amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
    paymentMethod: z.enum(["CASH", "UPI", "BANK", "CHEQUE"]),
    referenceId: z.string().optional(),
    notes: z.string().optional(),
});

interface RecordPaymentDialogProps {
    supplierId: string;
    supplierName: string;
    currentBalance: number;
    outletId: string;
    onSuccess: () => void;
}

export function RecordPaymentDialog({
    supplierId,
    supplierName,
    currentBalance,
    outletId,
    onSuccess
}: RecordPaymentDialogProps) {
    const [open, setOpen] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [formData, setFormData] = useState<z.infer<typeof formSchema> | null>(null);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            amount: 0,
            paymentMethod: "CASH",
            referenceId: "",
            notes: "",
        },
    });

    const paymentMutation = trpc.creditorLedger.recordPayment.useMutation({
        onSuccess: () => {
            toast({ title: "Payment Recorded", description: "Supplier account has been credited." });
            setOpen(false);
            form.reset();
            onSuccess();
        },
        onError: (err) => {
            toast({
                title: "Error Recording Payment",
                description: err.message,
                variant: "destructive"
            });
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        if (values.amount > currentBalance) {
            toast({
                title: "Warning",
                description: "Payment amount exceeds current balance. Please verify.",
                variant: "destructive"
            });
            // We can block or allow with warning. For now, we allow the submission to pin modal but API might reject if hard blocked.
            // API block confirmed: "Payment amount exceeds outstanding balance"
            return;
        }

        setFormData(values);
        setShowPin(true);
    }

    async function handlePinVerified(pin: string) {
        if (!formData) return;

        await paymentMutation.mutateAsync({
            supplierId,
            amount: formData.amount,
            paymentMethod: formData.paymentMethod,
            referenceId: formData.referenceId,
            notes: formData.notes,
            pin: pin,
        });
    }

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <Wallet className="h-4 w-4 mr-2" />
                        Record Payment
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Record Payment to {supplierName}</DialogTitle>
                        <DialogDescription>
                            Log a payment made to this supplier to reduce the outstanding balance.
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Payment Amount (₹)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" className="text-lg" {...field} />
                                        </FormControl>
                                        <div className="text-xs text-muted-foreground text-right">
                                            Max: ₹{currentBalance.toFixed(2)}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="paymentMethod"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Payment Method</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select method" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="CASH">Cash</SelectItem>
                                                <SelectItem value="UPI">UPI</SelectItem>
                                                <SelectItem value="BANK">Bank Transfer (IMPS/NEFT)</SelectItem>
                                                <SelectItem value="CHEQUE">Cheque</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="referenceId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Reference Number (UTR / Cheque No.)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Optional reference..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notes (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Additional details..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    Proceed to Verify
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* PIN Verification Modal */}
            <PinVerificationModal
                open={showPin}
                onOpenChange={setShowPin}
                action="SUPPLIER_PAYMENT"
                actionDescription={`Pay ₹${formData?.amount} to ${supplierName}`}
                targetDescription={`via ${formData?.paymentMethod}`}
                onSuccess={handlePinVerified}
                warnings={
                    formData?.amount && formData.amount >= 5000
                        ? ["Large payment amount.", "Managers will be notified of this transaction."]
                        : []
                }
            />
        </>
    );
}

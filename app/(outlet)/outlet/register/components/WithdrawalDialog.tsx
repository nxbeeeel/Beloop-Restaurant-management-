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
import { ArrowDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { PinVerificationModal } from "@/components/security/PinVerificationModal";

const formSchema = z.object({
    amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
    purpose: z.enum(["BANK_DEPOSIT", "OWNER_WITHDRAWAL", "EMERGENCY", "PETTY_CASH"]),
    handedTo: z.string().min(2, "Receiver name required"),
    notes: z.string().optional(),
});

interface WithdrawalDialogProps {
    registerId: string;
    outletId: string;
    onSuccess: () => void;
}

export function WithdrawalDialog({ registerId, outletId, onSuccess }: WithdrawalDialogProps) {
    const [open, setOpen] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [formData, setFormData] = useState<z.infer<typeof formSchema> | null>(null);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            amount: 0,
            purpose: "BANK_DEPOSIT",
            handedTo: "",
            notes: "",
        },
    });

    const withdrawalMutation = trpc.dailyRegister.recordWithdrawal.useMutation({
        onSuccess: () => {
            toast({ title: "Withdrawal Recorded", description: "Cash withdrawal has been logged successfully." });
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

    function onSubmit(values: z.infer<typeof formSchema>) {
        setFormData(values);
        setShowPin(true);
    }

    async function handlePinVerified(pin: string) {
        if (!formData) return;

        await withdrawalMutation.mutateAsync({
            registerId,
            amount: formData.amount,
            purpose: formData.purpose,
            handedTo: formData.handedTo,
            notes: formData.notes,
            pin: pin,
        });
    }

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="text-red-700 bg-red-50 border-red-200 hover:bg-red-100">
                        <ArrowDown className="h-4 w-4 mr-2" />
                        Withdraw Cash
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Record Cash Withdrawal</DialogTitle>
                        <DialogDescription>
                            Log physical cash taken out of the drawer for deposits or other purposes.
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount to Withdraw (₹)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" className="text-lg" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="purpose"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Purpose</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select purpose" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="BANK_DEPOSIT">Bank Deposit</SelectItem>
                                                <SelectItem value="OWNER_WITHDRAWAL">Owner Withdrawal</SelectItem>
                                                <SelectItem value="PETTY_CASH">Petty Cash Top-up</SelectItem>
                                                <SelectItem value="EMERGENCY">Emergency Expense</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="handedTo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Handed To</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Name of person receiving cash" {...field} />
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
                action="WITHDRAWAL"
                actionDescription={`Withdraw ₹${formData?.amount}`}
                targetDescription={`For ${formData?.purpose.replace("_", " ")}`}
                onSuccess={handlePinVerified}
                warnings={["This action will reduce the calculated cash in drawer immediately."]}
            />
        </>
    );
}

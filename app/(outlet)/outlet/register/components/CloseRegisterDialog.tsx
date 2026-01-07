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
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Lock, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { PinVerificationModal } from "@/components/security/PinVerificationModal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formSchema = z.object({
    physicalCash: z.coerce.number().min(0, "Cash cannot be negative"),
    varianceReason: z.string().optional(),
    denomination2000: z.coerce.number().min(0).optional(),
    denomination500: z.coerce.number().min(0).optional(),
    denomination200: z.coerce.number().min(0).optional(),
    denomination100: z.coerce.number().min(0).optional(),
    denomination50: z.coerce.number().min(0).optional(),
    denomination20: z.coerce.number().min(0).optional(),
    denomination10: z.coerce.number().min(0).optional(),
    denominationCoins: z.coerce.number().min(0).optional(),
});

interface CloseRegisterDialogProps {
    registerId: string;
    currentBalance: number;
    outletId: string;
    onSuccess: () => void;
}

export function CloseRegisterDialog({ registerId, currentBalance, outletId, onSuccess }: CloseRegisterDialogProps) {
    const [open, setOpen] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [formData, setFormData] = useState<z.infer<typeof formSchema> | null>(null);
    const { toast } = useToast();

    // Fetch security settings to know variance threshold
    const { data: settings } = trpc.security.getSettings.useQuery({ outletId });
    const varianceThreshold = Number(settings?.varianceThreshold || 10);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            physicalCash: 0,
            varianceReason: "",
        },
    });

    // Auto-calculate total from denominations
    const calculateTotal = (values: Partial<z.infer<typeof formSchema>>) => {
        let total = 0;
        total += (values.denomination2000 || 0) * 2000;
        total += (values.denomination500 || 0) * 500;
        total += (values.denomination200 || 0) * 200;
        total += (values.denomination100 || 0) * 100;
        total += (values.denomination50 || 0) * 50;
        total += (values.denomination20 || 0) * 20;
        total += (values.denomination10 || 0) * 10;
        total += (values.denominationCoins || 0);
        return total;
    };

    const handleDenominationChange = () => {
        const values = form.getValues();
        const total = calculateTotal(values);
        form.setValue("physicalCash", total);
    };

    const closeRegisterMutation = trpc.dailyRegister.closeRegister.useMutation({
        onSuccess: () => {
            toast({
                title: "Register Closed",
                description: "Day closing completed successfully.",
            });
            setOpen(false);
            onSuccess();
        },
        onError: (err) => {
            if (err.data?.code === "UNAUTHORIZED") {
                // Should be caught by pin check, but fallback here
                setShowPin(true);
            } else {
                toast({
                    title: "Error Closing Register",
                    description: err.message,
                    variant: "destructive",
                });
            }
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        setFormData(values);
        const variance = Math.abs(values.physicalCash - currentBalance);

        if (variance > varianceThreshold) {
            setShowPin(true);
        } else {
            // No strict PIN required for small variance
            executeClose(values);
        }
    }

    async function executeClose(values: z.infer<typeof formSchema>, pin?: string) {
        const denominations = {
            "2000": values.denomination2000 || 0,
            "500": values.denomination500 || 0,
            "200": values.denomination200 || 0,
            "100": values.denomination100 || 0,
            "50": values.denomination50 || 0,
            "20": values.denomination20 || 0,
            "10": values.denomination10 || 0,
            "coins": values.denominationCoins || 0,
        };

        await closeRegisterMutation.mutateAsync({
            registerId,
            physicalCash: values.physicalCash,
            denominations,
            varianceReason: values.varianceReason,
            pin,
        });
    }

    const variance = Math.abs(form.watch("physicalCash") - currentBalance);
    const isVarianceHigh = variance > varianceThreshold;

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button variant="destructive">
                        <Lock className="h-4 w-4 mr-2" />
                        Close Register
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Close Daily Register</DialogTitle>
                        <DialogDescription>
                            Count physical cash and enter denominations.
                            System Expects: <strong>₹{currentBalance.toFixed(2)}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                            {/* Simple Denomination Inputs */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {["2000", "500", "200", "100", "50", "20", "10", "Coins"].map((denom) => (
                                    <div key={denom} className="space-y-1">
                                        <FormLabel className="text-xs text-muted-foreground">
                                            {denom === "Coins" ? "Coins (Tot)" : `₹${denom}`}
                                        </FormLabel>
                                        <Input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            {...form.register(
                                                denom === "Coins"
                                                    ? "denominationCoins"
                                                    : `denomination${denom}` as any,
                                                { onChange: handleDenominationChange }
                                            )}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                                <FormField
                                    control={form.control}
                                    name="physicalCash"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-base font-semibold">Total Physical Cash</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2.5 font-bold text-muted-foreground">₹</span>
                                                    <Input type="number" className="pl-8 text-lg font-bold" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormDescription>
                                                Auto-calculated from denominations above.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {isVarianceHigh && (
                                    <Alert variant="destructive" className="bg-red-50 border-red-200">
                                        <AlertTriangle className="h-4 w-4 text-red-600" />
                                        <AlertTitle className="text-red-800">High Variance Detected</AlertTitle>
                                        <AlertDescription className="text-red-700 space-y-2">
                                            <p>Difference: <strong>₹{variance.toFixed(2)}</strong></p>
                                            <p className="text-xs">Manager verification (PIN) will be required to close.</p>

                                            <FormField
                                                control={form.control}
                                                name="varianceReason"
                                                render={({ field }) => (
                                                    <Input
                                                        placeholder="Reason for discrepancy (required)"
                                                        className="mt-2 bg-white"
                                                        {...field}
                                                    />
                                                )}
                                            />
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={closeRegisterMutation.isPending}>
                                    {closeRegisterMutation.isPending && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    {isVarianceHigh ? "Verify & Close" : "Confirm Closing"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <PinVerificationModal
                open={showPin}
                onOpenChange={setShowPin}
                action="MODIFY_CLOSING"
                actionDescription={`Authorize Closing Discrepancy`}
                targetDescription={`Variance: ₹${variance.toFixed(2)}`}
                onSuccess={(pin) => formData && executeClose(formData, pin)}
                warnings={["Large cash variance detected.", "This action will be logged and notified to managers."]}
            />
        </>
    );
}

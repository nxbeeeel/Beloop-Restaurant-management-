"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

const formSchema = z.object({
    actualOpening: z.coerce.number().min(0, "Opening balance cannot be negative"),
    openingNote: z.string().optional(),
});

interface OpenRegisterFormProps {
    outletId: string;
    onSuccess: () => void;
}

export function OpenRegisterForm({ outletId, onSuccess }: OpenRegisterFormProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch previous register to get expected closing balance
    const { data: lastClosing } = trpc.dailyRegister.getLastClosing.useQuery({ outletId });
    const expectedOpening = Number(lastClosing?.physicalCash ?? 0);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            actualOpening: 0,
            openingNote: "",
        },
    });

    const openRegisterMutation = trpc.dailyRegister.openRegister.useMutation({
        onSuccess: () => {
            toast({
                title: "Register Opened",
                description: "You have successfully opened the register for today.",
            });
            onSuccess();
        },
        onError: (error) => {
            toast({
                title: "Failed to Open Register",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        try {
            await openRegisterMutation.mutateAsync({
                outletId,
                date: format(new Date(), "yyyy-MM-dd"),
                expectedOpening: expectedOpening, // Pass expected from system
                actualOpening: values.actualOpening,
                openingNote: values.openingNote,
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card className="w-full max-w-lg mx-auto border-2 border-primary/10 shadow-lg">
            <CardHeader className="bg-primary/5 pb-8 border-b border-primary/10">
                <CardTitle className="text-2xl text-primary">Open Register</CardTitle>
                <CardDescription>
                    Enter the physical cash amount currently in the drawer to start the day.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="actualOpening"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-base font-semibold">Opening Cash (₹)</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-gray-500 font-bold">₹</span>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                className="pl-8 text-lg py-6"
                                                placeholder="0.00"
                                                {...field}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormDescription>
                                        Count and verify the total cash currently in the drawer.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Variance Warning if mismatch (Interactive) */}
                        {form.watch("actualOpening") !== expectedOpening && expectedOpening > 0 && (
                            <Alert variant="default" className="bg-amber-50 border-amber-200">
                                <AlertCircle className="h-4 w-4 text-amber-600" />
                                <AlertTitle className="text-amber-800">Variance Detected</AlertTitle>
                                <AlertDescription className="text-amber-700">
                                    System expected <strong>₹{expectedOpening}</strong> based on yesterday's closing.
                                    You are opening with a difference of
                                    <strong> ₹{form.watch("actualOpening") - expectedOpening}</strong>.
                                </AlertDescription>
                            </Alert>
                        )}

                        <FormField
                            control={form.control}
                            name="openingNote"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Opening Note (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Any notes about the opening condition..."
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button
                            type="submit"
                            className="w-full text-lg py-6"
                            size="lg"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Opening..." : "Confirm & Open Register"}
                            {!isSubmitting && <ArrowRight className="ml-2 h-5 w-5" />}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function CreatePaymentPage() {
    const router = useRouter();
    const { data: user } = trpc.dashboard.getUser.useQuery();
    const outletId = user?.outletId || "";

    const [supplierId, setSupplierId] = useState("");
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState("CASH");
    const [reference, setReference] = useState("");
    const [notes, setNotes] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Fix: suppliers.list takes no arguments
    const { data: suppliers } = trpc.suppliers.list.useQuery();

    const createMutation = trpc.payments.create.useMutation({
        onSuccess: () => {
            toast.success("Payment recorded successfully");
            router.push("/outlet/payments");
        },
        onError: (err: any) => toast.error(err.message)
    });

    const handleSubmit = () => {
        if (!supplierId) {
            toast.error("Please select a supplier");
            return;
        }
        if (!amount || Number(amount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        createMutation.mutate({
            outletId,
            supplierId,
            amount: Number(amount),
            date: new Date(date),
            method,
            reference,
            notes
        });
    };

    return (
        <div className="space-y-6 pb-24 lg:pb-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Record Payment</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Payment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Supplier</Label>
                        <Select value={supplierId} onValueChange={setSupplierId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select supplier..." />
                            </SelectTrigger>
                            <SelectContent>
                                {suppliers?.map((s: any) => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Amount (₹)</Label>
                            <Input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Payment Method</Label>
                        <Select value={method} onValueChange={setMethod}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CASH">Cash</SelectItem>
                                <SelectItem value="UPI">UPI</SelectItem>
                                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                <SelectItem value="CHEQUE">Cheque</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Reference / Transaction ID</Label>
                        <Input
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            placeholder="Optional"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Optional notes..."
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-4">
                        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                            {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Record Payment
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

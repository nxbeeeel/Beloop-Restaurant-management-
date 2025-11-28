"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, CheckCircle, AlertCircle, Search } from "lucide-react";

export default function PaymentsPage() {
    const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
    const [selectedTenantId, setSelectedTenantId] = useState<string>("");
    const [amount, setAmount] = useState<string>("");
    const [method, setMethod] = useState<string>("BANK_TRANSFER");
    const [notes, setNotes] = useState<string>("");

    const utils = trpc.useContext();
    const { data: payments, isLoading: isLoadingPayments } = trpc.super.listPayments.useQuery();
    const { data: overdueTenants, isLoading: isLoadingOverdue } = trpc.super.getOverdueTenants.useQuery();
    const { data: tenants } = trpc.super.listTenants.useQuery(); // For manual payment selection

    const recordPaymentMutation = trpc.super.recordPayment.useMutation({
        onSuccess: () => {
            toast.success("Payment recorded successfully");
            setIsAddPaymentOpen(false);
            setAmount("");
            setNotes("");
            setSelectedTenantId("");
            utils.super.listPayments.invalidate();
            utils.super.getOverdueTenants.invalidate();
            utils.super.listTenants.invalidate();
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const handleRecordPayment = () => {
        if (!selectedTenantId || !amount) {
            toast.error("Please fill in all required fields");
            return;
        }

        recordPaymentMutation.mutate({
            tenantId: selectedTenantId,
            amount: parseFloat(amount),
            method,
            date: new Date(),
            notes,
        });
    };

    const handleConfirmOverduePayment = (tenantId: string, price: number) => {
        setSelectedTenantId(tenantId);
        setAmount(price.toString());
        setIsAddPaymentOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Payments</h2>
                    <p className="text-muted-foreground">Manage tenant payments and subscriptions.</p>
                </div>
                <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Record Payment
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Record Manual Payment</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Tenant</Label>
                                <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Tenant" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tenants?.map((tenant) => (
                                            <SelectItem key={tenant.id} value={tenant.id}>
                                                {tenant.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Amount</Label>
                                <Input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Payment Method</Label>
                                <Select value={method} onValueChange={setMethod}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CASH">Cash</SelectItem>
                                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                        <SelectItem value="UPI">UPI</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Notes</Label>
                                <Input
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Transaction ID, Reference, etc."
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddPaymentOpen(false)}>Cancel</Button>
                            <Button onClick={handleRecordPayment} disabled={recordPaymentMutation.isLoading}>
                                {recordPaymentMutation.isLoading ? "Recording..." : "Record Payment"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Overdue Tenants Section */}
            {overdueTenants && overdueTenants.length > 0 && (
                <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                        <CardTitle className="text-red-700 flex items-center">
                            <AlertCircle className="mr-2 h-5 w-5" />
                            Overdue Payments
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tenant</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Amount Due</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {overdueTenants.map((tenant) => (
                                    <TableRow key={tenant.id}>
                                        <TableCell className="font-medium">{tenant.name}</TableCell>
                                        <TableCell>{tenant.nextBillingDate ? new Date(tenant.nextBillingDate).toLocaleDateString() : 'N/A'}</TableCell>
                                        <TableCell>₹{tenant.pricePerOutlet}</TableCell>
                                        <TableCell>
                                            {tenant.outlets[0]?.users[0]?.email || 'No contact'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                onClick={() => handleConfirmOverduePayment(tenant.id, tenant.pricePerOutlet)}
                                            >
                                                Confirm Payment
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Payment History */}
            <Card>
                <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Tenant</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Recorded By</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingPayments ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                                </TableRow>
                            ) : payments?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No payments recorded yet.</TableCell>
                                </TableRow>
                            ) : (
                                payments?.map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium">{payment.tenant.name}</TableCell>
                                        <TableCell>₹{payment.amount.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                                                {payment.method}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                                                {payment.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">{payment.notes || '-'}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

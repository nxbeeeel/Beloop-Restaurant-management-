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
import { Plus, AlertCircle } from "lucide-react";

export default function PaymentsPage() {
    const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
    const [selectedTenantId, setSelectedTenantId] = useState<string>("");
    const [amount, setAmount] = useState<string>("");
    const [method, setMethod] = useState<string>("BANK_TRANSFER");
    const [notes, setNotes] = useState<string>("");

    const utils = trpc.useContext();
    const { data: payments, isLoading: isLoadingPayments } = trpc.super.listPayments.useQuery();
    const { data: billingOverview, isLoading: isLoadingBilling } = trpc.billing.getBillingOverview.useQuery();

    const recordPaymentMutation = trpc.super.recordPayment.useMutation({
        onSuccess: () => {
            toast.success("Payment recorded successfully");
            setIsAddPaymentOpen(false);
            setAmount("");
            setNotes("");
            setSelectedTenantId("");
            utils.super.listPayments.invalidate();
            utils.billing.getBillingOverview.invalidate();
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
            amount: Number(amount),
            method,
            date: new Date(),
            notes,
        });
    };

    const handleConfirmOverduePayment = (tenantId: string, dueAmount: number) => {
        setSelectedTenantId(tenantId);
        setAmount(dueAmount.toString());
        setIsAddPaymentOpen(true);
    };

    const overdueTenants = billingOverview?.filter(t => t.isOverdue) || [];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Payments & Billing</h2>
                    <p className="text-stone-400">Manage tenant fees, due dates, and record payments.</p>
                </div>
                <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-rose-600 hover:bg-rose-700 text-white">
                            <Plus className="mr-2 h-4 w-4" /> Record Payment
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-stone-900 border-stone-800 text-white">
                        <DialogHeader>
                            <DialogTitle>Record Manual Payment</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label className="text-stone-400">Tenant</Label>
                                <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                                    <SelectTrigger className="bg-stone-950 border-stone-800 text-white">
                                        <SelectValue placeholder="Select Tenant" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-stone-900 border-stone-800 text-white">
                                        {billingOverview?.map((tenant) => (
                                            <SelectItem key={tenant.id} value={tenant.id}>
                                                {tenant.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-stone-400">Amount</Label>
                                <Input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="bg-stone-950 border-stone-800 text-white"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-stone-400">Payment Method</Label>
                                <Select value={method} onValueChange={setMethod}>
                                    <SelectTrigger className="bg-stone-950 border-stone-800 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-stone-900 border-stone-800 text-white">
                                        <SelectItem value="CASH">Cash</SelectItem>
                                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                        <SelectItem value="UPI">UPI</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-stone-400">Notes</Label>
                                <Input
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Transaction ID, Reference, etc."
                                    className="bg-stone-950 border-stone-800 text-white"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddPaymentOpen(false)} className="border-stone-800 text-stone-300 hover:bg-stone-800 hover:text-white">Cancel</Button>
                            <Button onClick={handleRecordPayment} disabled={recordPaymentMutation.isPending} className="bg-rose-600 hover:bg-rose-700 text-white">
                                {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Billing Status / Overdue Section */}
            <div className="grid grid-cols-1 gap-6">
                {/* Overdue Alerts */}
                {overdueTenants.length > 0 && (
                    <Card className="border-red-900/50 bg-red-950/20">
                        <CardHeader>
                            <CardTitle className="text-red-400 flex items-center">
                                <AlertCircle className="mr-2 h-5 w-5" />
                                Overdue Payments ({overdueTenants.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-red-900/30 hover:bg-transparent">
                                        <TableHead className="text-red-300">Tenant</TableHead>
                                        <TableHead className="text-red-300">Outlets</TableHead>
                                        <TableHead className="text-red-300">Due Date</TableHead>
                                        <TableHead className="text-red-300">Days Overdue</TableHead>
                                        <TableHead className="text-red-300">Calc. Amount</TableHead>
                                        <TableHead className="text-right text-red-300">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {overdueTenants.map((tenant) => (
                                        <TableRow key={tenant.id} className="border-red-900/30 hover:bg-red-900/10">
                                            <TableCell className="font-medium text-red-200">{tenant.name}</TableCell>
                                            <TableCell className="text-red-200">{tenant.outletCount}</TableCell>
                                            <TableCell className="text-red-200">{tenant.nextBillingDate ? new Date(tenant.nextBillingDate).toLocaleDateString() : 'N/A'}</TableCell>
                                            <TableCell className="text-red-500 font-bold">{tenant.daysOverdue}</TableCell>
                                            <TableCell className="text-red-200">₹{tenant.monthlyFee.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="destructive" onClick={() => handleConfirmOverduePayment(tenant.id, tenant.monthlyFee)}>
                                                    Collect Payment
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* All Tenants Billing Overview */}
                <Card className="bg-stone-900 border-stone-800">
                    <CardHeader>
                        <CardTitle className="text-white">Billing Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="border-stone-800 hover:bg-transparent">
                                    <TableHead className="text-stone-400">Tenant</TableHead>
                                    <TableHead className="text-stone-400">Outlets</TableHead>
                                    <TableHead className="text-stone-400">Rate/Outlet</TableHead>
                                    <TableHead className="text-stone-400">Monthly Fee</TableHead>
                                    <TableHead className="text-stone-400">Next Bill</TableHead>
                                    <TableHead className="text-stone-400">Last Payment</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingBilling ? (
                                    <TableRow className="border-stone-800"><TableCell colSpan={6} className="text-center text-stone-500">Loading...</TableCell></TableRow>
                                ) : (
                                    billingOverview?.map((tenant) => (
                                        <TableRow key={tenant.id} className="border-stone-800 hover:bg-stone-800/50">
                                            <TableCell className="font-medium text-white">{tenant.name}</TableCell>
                                            <TableCell className="text-stone-300">{tenant.outletCount}</TableCell>
                                            <TableCell className="text-stone-300">₹{tenant.pricePerOutlet}</TableCell>
                                            <TableCell className="text-stone-300">₹{tenant.monthlyFee.toLocaleString()}</TableCell>
                                            <TableCell>
                                                <span className={tenant.isOverdue ? "text-red-400 font-bold" : "text-stone-300"}>
                                                    {tenant.nextBillingDate ? new Date(tenant.nextBillingDate).toLocaleDateString() : '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-stone-500 text-sm">
                                                {tenant.lastPayment ? `₹${tenant.lastPayment.amount} on ${new Date(tenant.lastPayment.createdAt).toLocaleDateString()}` : 'None'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Recent Payments Log */}
                <Card className="bg-stone-900 border-stone-800">
                    <CardHeader>
                        <CardTitle className="text-white">Recent Payments Log</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="border-stone-800 hover:bg-transparent">
                                    <TableHead className="text-stone-400">Date</TableHead>
                                    <TableHead className="text-stone-400">Tenant</TableHead>
                                    <TableHead className="text-stone-400">Amount</TableHead>
                                    <TableHead className="text-stone-400">Method</TableHead>
                                    <TableHead className="text-stone-400">Status</TableHead>
                                    <TableHead className="text-stone-400">Notes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingPayments ? (
                                    <TableRow className="border-stone-800"><TableCell colSpan={6} className="text-center text-stone-500">Loading...</TableCell></TableRow>
                                ) : payments?.length === 0 ? (
                                    <TableRow className="border-stone-800"><TableCell colSpan={6} className="text-center text-stone-500">No recent payments.</TableCell></TableRow>
                                ) : (
                                    payments?.map((payment) => (
                                        <TableRow key={payment.id} className="border-stone-800 hover:bg-stone-800/50">
                                            <TableCell className="text-stone-300">{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell className="font-medium text-white">{payment.tenant.name}</TableCell>
                                            <TableCell className="text-stone-300">₹{payment.amount.toLocaleString()}</TableCell>
                                            <TableCell className="text-stone-300">{payment.method}</TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-500">
                                                    {payment.status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-stone-500 text-xs">{payment.notes || '-'}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

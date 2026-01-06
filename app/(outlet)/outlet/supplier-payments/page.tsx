"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CreditCard, IndianRupee, Truck, Plus, Download, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, exportToCsv } from "@/lib/export";
import { Skeleton, SkeletonTable } from "@/components/ui/skeleton-loaders";

export default function SupplierPaymentsPage() {
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
    const [paymentNote, setPaymentNote] = useState("");

    const utils = trpc.useUtils();

    // Fetch suppliers with balances
    const { data: suppliers, isLoading } = trpc.suppliers.list.useQuery();

    // Only show suppliers with balance > 0
    const suppliersWithBalance = suppliers?.filter(s => s.balance > 0) || [];
    const totalPending = suppliersWithBalance.reduce((sum, s) => sum + s.balance, 0);

    // Payment mutation - we'll use the existing procurement router if it has payment
    // For now, create a simple UI that would integrate with backend
    const handlePayment = () => {
        if (!selectedSupplier || !paymentAmount) {
            toast.error("Please select supplier and enter amount");
            return;
        }
        const amount = parseFloat(paymentAmount);
        if (amount <= 0) {
            toast.error("Amount must be greater than 0");
            return;
        }
        if (amount > selectedSupplier.balance) {
            toast.error("Amount cannot exceed balance");
            return;
        }

        // TODO: Call backend mutation to create SupplierPayment
        toast.success(`Payment of ${formatCurrency(amount)} recorded for ${selectedSupplier.name}`);
        setIsPaymentOpen(false);
        resetForm();
        utils.suppliers.list.invalidate();
    };

    const resetForm = () => {
        setSelectedSupplier(null);
        setPaymentAmount("");
        setPaymentMethod("CASH");
        setPaymentNote("");
    };

    const openPaymentDialog = (supplier: any) => {
        setSelectedSupplier(supplier);
        setPaymentAmount(supplier.balance.toString());
        setIsPaymentOpen(true);
    };

    const handleExport = () => {
        if (!suppliersWithBalance.length) {
            toast.error("No pending payments to export");
            return;
        }
        exportToCsv(suppliersWithBalance, [
            { header: "Supplier", accessor: "name" },
            { header: "Balance (₹)", accessor: (r) => r.balance.toFixed(2) },
            { header: "Phone", accessor: "whatsappNumber" },
            { header: "Last Payment", accessor: (r) => r.lastPayment ? formatDate(r.lastPayment.date) : "-" },
            { header: "Last Amount", accessor: (r) => r.lastPayment ? r.lastPayment.amount.toFixed(2) : "-" },
        ], "pending-supplier-payments");
        toast.success("Exported to CSV");
    };

    if (isLoading) {
        return (
            <div className="space-y-6 pb-20">
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                </div>
                <SkeletonTable rows={5} cols={5} />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 md:pb-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <CreditCard className="h-7 w-7 text-primary" />
                        Supplier Payments
                    </h1>
                    <p className="text-gray-500 text-sm">Track and record payments to suppliers</p>
                </div>
                <Button variant="outline" onClick={handleExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-orange-50 border-orange-200">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-orange-700">Total Pending</p>
                            <IndianRupee className="h-4 w-4 text-orange-500" />
                        </div>
                        <p className="text-2xl font-bold text-orange-700">{formatCurrency(totalPending)}</p>
                        <p className="text-xs text-orange-600 mt-1">{suppliersWithBalance.length} suppliers</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-500">Total Suppliers</p>
                            <Truck className="h-4 w-4 text-gray-400" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{suppliers?.length || 0}</p>
                    </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-green-700">Fully Paid</p>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                        <p className="text-2xl font-bold text-green-700">
                            {(suppliers?.length || 0) - suppliersWithBalance.length}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Pending Payments Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Pending Payments</CardTitle>
                    <CardDescription>Click on a supplier to record a payment</CardDescription>
                </CardHeader>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Supplier</TableHead>
                            <TableHead className="text-right">Balance Due</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Last Payment</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {suppliersWithBalance.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                                    <p className="font-medium">All suppliers are paid! 🎉</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            suppliersWithBalance.map((supplier) => (
                                <TableRow key={supplier.id} className="hover:bg-gray-50">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 font-bold text-sm">
                                                {supplier.name.charAt(0)}
                                            </div>
                                            <span className="font-medium">{supplier.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className="font-semibold text-orange-600">
                                            {formatCurrency(supplier.balance)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-gray-500">
                                        {supplier.whatsappNumber || "-"}
                                    </TableCell>
                                    <TableCell>
                                        {supplier.lastPayment ? (
                                            <div className="text-sm">
                                                <p className="text-gray-700">{formatCurrency(supplier.lastPayment.amount)}</p>
                                                <p className="text-xs text-gray-500">{formatDate(supplier.lastPayment.date)}</p>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-sm">Never paid</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="sm"
                                            onClick={() => openPaymentDialog(supplier)}
                                        >
                                            Pay Now
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Payment Dialog */}
            <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Record Payment</DialogTitle>
                    </DialogHeader>
                    {selectedSupplier && (
                        <div className="space-y-4">
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="font-medium text-gray-900">{selectedSupplier.name}</p>
                                <p className="text-sm text-gray-500">
                                    Balance: <span className="text-orange-600 font-semibold">{formatCurrency(selectedSupplier.balance)}</span>
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Payment Amount (₹)</Label>
                                <Input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    max={selectedSupplier.balance}
                                />
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPaymentAmount(selectedSupplier.balance.toString())}
                                    >
                                        Full Amount
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPaymentAmount((selectedSupplier.balance / 2).toFixed(2))}
                                    >
                                        Half
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Payment Method</Label>
                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CASH">Cash</SelectItem>
                                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                        <SelectItem value="UPI">UPI</SelectItem>
                                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Note (Optional)</Label>
                                <Input
                                    value={paymentNote}
                                    onChange={(e) => setPaymentNote(e.target.value)}
                                    placeholder="e.g., Partial payment, PO #123"
                                />
                            </div>

                            <Button onClick={handlePayment} className="w-full">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Record Payment
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

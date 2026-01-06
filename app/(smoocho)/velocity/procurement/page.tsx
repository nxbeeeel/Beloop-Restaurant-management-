"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Package, Send, CheckCircle, CreditCard, Banknote, Plus, Trash2, ExternalLink, Receipt, Clock } from "lucide-react";

/**
 * SMOOCHO Velocity - Procurement Page (Bill Manager)
 * 
 * Features:
 * - Supplier selection with WhatsApp ordering
 * - Dynamic item list builder
 * - Mark Received flow with cash/credit payment
 * - Pending orders list
 */

// Skeleton component
function Skeleton({ className = "" }: { className?: string }) {
    return <div className={`animate-pulse rounded-lg bg-slate-700/50 ${className}`} />;
}

interface OrderItem {
    name: string;
    qty: number;
    unit: string;
}

export default function ProcurementPage() {
    const { user } = useUser();
    const [outletId, setOutletId] = useState<string | null>(null);

    // Order creation state
    const [selectedSupplier, setSelectedSupplier] = useState("");
    const [orderItems, setOrderItems] = useState<OrderItem[]>([{ name: "", qty: 1, unit: "kg" }]);
    const [orderNotes, setOrderNotes] = useState("");
    const [createDialogOpen, setCreateDialogOpen] = useState(false);

    // Receive order state
    const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
    const [billAmount, setBillAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CREDIT">("CREDIT");

    // Pay supplier state
    const [payDialogOpen, setPayDialogOpen] = useState(false);
    const [selectedSupplierForPay, setSelectedSupplierForPay] = useState<{ id: string; name: string; balance: number } | null>(null);
    const [payAmount, setPayAmount] = useState("");
    const [payMethod, setPayMethod] = useState<"CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE">("UPI");

    useEffect(() => {
        if (user?.publicMetadata?.outletId) {
            setOutletId(user.publicMetadata.outletId as string);
        }
    }, [user]);

    // Queries
    const { data: suppliers, isLoading: suppliersLoading } = api.velocity.getSuppliers.useQuery(
        { outletId: outletId! },
        { enabled: !!outletId }
    );

    const { data: pendingOrders, isLoading: ordersLoading, refetch: refetchOrders } = api.velocity.getPendingOrders.useQuery(
        { outletId: outletId! },
        { enabled: !!outletId }
    );

    const { data: payables, refetch: refetchPayables } = api.velocity.getPayables.useQuery(
        { outletId: outletId! },
        { enabled: !!outletId }
    );

    // Mutations
    const createOrderMutation = api.velocity.createQuickOrder.useMutation({
        onSuccess: (data) => {
            toast.success("Order created!");
            setCreateDialogOpen(false);
            resetOrderForm();
            refetchOrders();

            // Open WhatsApp if link available
            if (data.whatsappLink) {
                window.open(data.whatsappLink, "_blank");
            }
        },
        onError: (error) => {
            toast.error(error.message || "Failed to create order");
        },
    });

    const receiveOrderMutation = api.velocity.receiveOrder.useMutation({
        onSuccess: (data) => {
            const status = data.paymentStatus === "PAID" ? "Paid by cash" : "Added to credit";
            toast.success(`Order received! ${status}`);
            setReceiveDialogOpen(false);
            setSelectedOrder(null);
            setBillAmount("");
            refetchOrders();
            refetchPayables();
        },
        onError: (error) => {
            toast.error(error.message || "Failed to receive order");
        },
    });

    const paySupplierMutation = api.velocity.paySupplier.useMutation({
        onSuccess: () => {
            toast.success("Payment recorded!");
            setPayDialogOpen(false);
            setSelectedSupplierForPay(null);
            setPayAmount("");
            refetchPayables();
        },
        onError: (error) => {
            toast.error(error.message || "Failed to record payment");
        },
    });

    const resetOrderForm = () => {
        setSelectedSupplier("");
        setOrderItems([{ name: "", qty: 1, unit: "kg" }]);
        setOrderNotes("");
    };

    const addItem = () => {
        setOrderItems([...orderItems, { name: "", qty: 1, unit: "kg" }]);
    };

    const removeItem = (index: number) => {
        if (orderItems.length > 1) {
            setOrderItems(orderItems.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index: number, field: keyof OrderItem, value: string | number) => {
        const updated = [...orderItems];
        updated[index] = { ...updated[index], [field]: value };
        setOrderItems(updated);
    };

    const handleCreateOrder = () => {
        if (!outletId || !selectedSupplier || orderItems.some(i => !i.name)) return;

        createOrderMutation.mutate({
            outletId,
            supplierId: selectedSupplier,
            items: orderItems.filter(i => i.name),
            notes: orderNotes || undefined
        });
    };

    const handleReceiveOrder = () => {
        if (!selectedOrder || !billAmount) return;

        receiveOrderMutation.mutate({
            orderId: selectedOrder,
            billAmount: parseFloat(billAmount),
            paymentMethod
        });
    };

    const handlePaySupplier = () => {
        if (!outletId || !selectedSupplierForPay || !payAmount) return;

        paySupplierMutation.mutate({
            outletId,
            supplierId: selectedSupplierForPay.id,
            amount: parseFloat(payAmount),
            method: payMethod
        });
    };

    const isLoading = suppliersLoading || ordersLoading;

    if (isLoading || !outletId) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">Bill Manager</h2>
                <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-48" />
                    <Skeleton className="h-48" />
                </div>
            </div>
        );
    }

    const selectedSupplierData = suppliers?.find(s => s.id === selectedSupplier);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Bill Manager</h2>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600">
                            <Plus className="mr-2 h-4 w-4" />
                            New Order
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="border-slate-700 bg-slate-800 text-white sm:max-w-xl">
                        <DialogHeader>
                            <DialogTitle>Create Purchase Order</DialogTitle>
                            <DialogDescription className="text-slate-400">
                                Select supplier and add items to order via WhatsApp
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            {/* Supplier Selection */}
                            <div className="space-y-2">
                                <Label className="text-white">Supplier</Label>
                                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                                    <SelectTrigger className="border-slate-600 bg-slate-900">
                                        <SelectValue placeholder="Select supplier" />
                                    </SelectTrigger>
                                    <SelectContent className="border-slate-700 bg-slate-800">
                                        {suppliers?.map((supplier) => (
                                            <SelectItem key={supplier.id} value={supplier.id}>
                                                {supplier.name}
                                                {supplier.whatsappNumber && (
                                                    <span className="ml-2 text-emerald-400">📱</span>
                                                )}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedSupplierData && !selectedSupplierData.whatsappNumber && (
                                    <p className="text-xs text-amber-400">
                                        ⚠️ No WhatsApp number - order will be created but no link generated
                                    </p>
                                )}
                            </div>

                            {/* Items */}
                            <div className="space-y-2">
                                <Label className="text-white">Items</Label>
                                <div className="max-h-48 space-y-2 overflow-y-auto pr-2">
                                    {orderItems.map((item, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                placeholder="Item name"
                                                value={item.name}
                                                onChange={(e) => updateItem(index, "name", e.target.value)}
                                                className="flex-1 border-slate-600 bg-slate-900"
                                            />
                                            <Input
                                                type="number"
                                                placeholder="Qty"
                                                value={item.qty}
                                                onChange={(e) => updateItem(index, "qty", parseFloat(e.target.value) || 0)}
                                                className="w-20 border-slate-600 bg-slate-900"
                                            />
                                            <Select
                                                value={item.unit}
                                                onValueChange={(v) => updateItem(index, "unit", v)}
                                            >
                                                <SelectTrigger className="w-20 border-slate-600 bg-slate-900">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="border-slate-700 bg-slate-800">
                                                    <SelectItem value="kg">kg</SelectItem>
                                                    <SelectItem value="L">L</SelectItem>
                                                    <SelectItem value="pcs">pcs</SelectItem>
                                                    <SelectItem value="box">box</SelectItem>
                                                    <SelectItem value="pack">pack</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {orderItems.length > 1 && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeItem(index)}
                                                    className="shrink-0 text-rose-400 hover:bg-rose-500/10"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={addItem}
                                    className="border-slate-600"
                                >
                                    <Plus className="mr-2 h-3 w-3" />
                                    Add Item
                                </Button>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label className="text-white">Notes (Optional)</Label>
                                <Input
                                    placeholder="Any special instructions..."
                                    value={orderNotes}
                                    onChange={(e) => setOrderNotes(e.target.value)}
                                    className="border-slate-600 bg-slate-900"
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                onClick={handleCreateOrder}
                                disabled={
                                    !selectedSupplier ||
                                    orderItems.every(i => !i.name) ||
                                    createOrderMutation.isPending
                                }
                                className="w-full bg-emerald-500 hover:bg-emerald-600"
                            >
                                {createOrderMutation.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="mr-2 h-4 w-4" />
                                )}
                                Create & Send via WhatsApp
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="pending" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                    <TabsTrigger value="pending" className="data-[state=active]:bg-rose-500">
                        <Clock className="mr-2 h-4 w-4" />
                        Pending Orders
                    </TabsTrigger>
                    <TabsTrigger value="payables" className="data-[state=active]:bg-rose-500">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Payables
                    </TabsTrigger>
                </TabsList>

                {/* Pending Orders Tab */}
                <TabsContent value="pending">
                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardHeader>
                            <CardTitle className="text-white">Pending Orders</CardTitle>
                            <CardDescription className="text-slate-400">
                                Orders waiting to be received
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!pendingOrders || pendingOrders.length === 0 ? (
                                <div className="py-8 text-center text-slate-400">
                                    <Package className="mx-auto mb-3 h-12 w-12 opacity-50" />
                                    <p>No pending orders</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {pendingOrders.map((order) => (
                                        <div
                                            key={order.id}
                                            className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 p-4"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${order.status === "SENT"
                                                        ? "bg-amber-500/20 text-amber-400"
                                                        : "bg-slate-700 text-slate-400"
                                                    }`}>
                                                    <Package className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-white">
                                                        {order.supplier?.name || "Unknown Supplier"}
                                                    </p>
                                                    <p className="text-sm text-slate-400">
                                                        {order.items.length} items • {order.status}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {order.supplier?.whatsappNumber && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            const msg = encodeURIComponent(order.whatsappMessage || "Order follow-up");
                                                            window.open(
                                                                `https://wa.me/${order.supplier?.whatsappNumber?.replace(/\D/g, '')}?text=${msg}`,
                                                                "_blank"
                                                            );
                                                        }}
                                                        className="text-emerald-400 hover:bg-emerald-500/10"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedOrder(order.id);
                                                        setReceiveDialogOpen(true);
                                                    }}
                                                    className="bg-emerald-500 hover:bg-emerald-600"
                                                >
                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                    Receive
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Payables Tab */}
                <TabsContent value="payables">
                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardHeader>
                            <CardTitle className="text-white">Accounts Payable</CardTitle>
                            <CardDescription className="text-slate-400">
                                Suppliers with outstanding balances
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!payables || payables.length === 0 ? (
                                <div className="py-8 text-center text-slate-400">
                                    <Receipt className="mx-auto mb-3 h-12 w-12 opacity-50" />
                                    <p>No outstanding payables! 🎉</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {payables.map((supplier) => (
                                        <div
                                            key={supplier.id}
                                            className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 p-4"
                                        >
                                            <div>
                                                <p className="font-medium text-white">{supplier.name}</p>
                                                <p className="text-sm text-slate-400">
                                                    Ordered: ₹{supplier.totalOrdered.toLocaleString("en-IN")} |
                                                    Paid: ₹{supplier.totalPaid.toLocaleString("en-IN")}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <p className="text-lg font-bold text-amber-400">
                                                    ₹{supplier.balance.toLocaleString("en-IN")}
                                                </p>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedSupplierForPay(supplier);
                                                        setPayAmount(supplier.balance.toString());
                                                        setPayDialogOpen(true);
                                                    }}
                                                    className="bg-rose-500 hover:bg-rose-600"
                                                >
                                                    <Banknote className="mr-2 h-4 w-4" />
                                                    Pay
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Receive Order Dialog */}
            <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
                <DialogContent className="border-slate-700 bg-slate-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Receive Order</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Enter bill amount and payment method
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-white">Bill Invoice Amount (₹)</Label>
                            <Input
                                type="number"
                                value={billAmount}
                                onChange={(e) => setBillAmount(e.target.value)}
                                placeholder="0"
                                className="h-14 border-slate-600 bg-slate-900 text-xl"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-white">Payment Method</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    type="button"
                                    variant={paymentMethod === "CASH" ? "default" : "outline"}
                                    onClick={() => setPaymentMethod("CASH")}
                                    className={paymentMethod === "CASH"
                                        ? "bg-emerald-500 hover:bg-emerald-600"
                                        : "border-slate-600"
                                    }
                                >
                                    <Banknote className="mr-2 h-4 w-4" />
                                    Paid by Cash
                                </Button>
                                <Button
                                    type="button"
                                    variant={paymentMethod === "CREDIT" ? "default" : "outline"}
                                    onClick={() => setPaymentMethod("CREDIT")}
                                    className={paymentMethod === "CREDIT"
                                        ? "bg-amber-500 hover:bg-amber-600"
                                        : "border-slate-600"
                                    }
                                >
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Add to Credit
                                </Button>
                            </div>
                            <p className="text-xs text-slate-400">
                                {paymentMethod === "CASH"
                                    ? "Amount will be deducted from today's register"
                                    : "Amount will be added to supplier's payable balance"
                                }
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            onClick={handleReceiveOrder}
                            disabled={!billAmount || receiveOrderMutation.isPending}
                            className="w-full bg-emerald-500 hover:bg-emerald-600"
                        >
                            {receiveOrderMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCircle className="mr-2 h-4 w-4" />
                            )}
                            Confirm Receipt
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Pay Supplier Dialog */}
            <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
                <DialogContent className="border-slate-700 bg-slate-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Pay Supplier</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            {selectedSupplierForPay?.name} - Balance: ₹{selectedSupplierForPay?.balance.toLocaleString("en-IN")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-white">Payment Amount (₹)</Label>
                            <Input
                                type="number"
                                value={payAmount}
                                onChange={(e) => setPayAmount(e.target.value)}
                                placeholder="0"
                                className="h-14 border-slate-600 bg-slate-900 text-xl"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-white">Payment Method</Label>
                            <Select value={payMethod} onValueChange={(v) => setPayMethod(v as typeof payMethod)}>
                                <SelectTrigger className="border-slate-600 bg-slate-900">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-slate-700 bg-slate-800">
                                    <SelectItem value="CASH">Cash</SelectItem>
                                    <SelectItem value="UPI">UPI</SelectItem>
                                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                                </SelectContent>
                            </Select>
                            {payMethod === "CASH" && (
                                <p className="text-xs text-amber-400">
                                    ⚠️ Cash payment will also be recorded in today&apos;s register
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            onClick={handlePaySupplier}
                            disabled={!payAmount || paySupplierMutation.isPending}
                            className="w-full bg-rose-500 hover:bg-rose-600"
                        >
                            {paySupplierMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Banknote className="mr-2 h-4 w-4" />
                            )}
                            Record Payment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

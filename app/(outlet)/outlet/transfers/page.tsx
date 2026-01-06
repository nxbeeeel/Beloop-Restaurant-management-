"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { useOutletContext } from "@/hooks/useOutletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Package, Plus, Check, X, Truck, PackageCheck } from "lucide-react";
import { toast } from "sonner";

type TransferStatus = "REQUESTED" | "APPROVED" | "SHIPPED" | "RECEIVED" | "REJECTED" | "CANCELLED";

const statusColors: Record<TransferStatus, string> = {
    REQUESTED: "bg-yellow-500/20 text-yellow-400",
    APPROVED: "bg-blue-500/20 text-blue-400",
    SHIPPED: "bg-purple-500/20 text-purple-400",
    RECEIVED: "bg-green-500/20 text-green-400",
    REJECTED: "bg-red-500/20 text-red-400",
    CANCELLED: "bg-stone-500/20 text-stone-400",
};

export default function TransfersPage() {
    const { outletId, tenantId } = useOutletContext();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedOutlet, setSelectedOutlet] = useState("");
    const [notes, setNotes] = useState("");
    const [items, setItems] = useState<{ productId: string; productName: string; qtyRequested: number }[]>([]);
    const [selectedProduct, setSelectedProduct] = useState("");
    const [qty, setQty] = useState(1);

    const utils = api.useUtils();

    // Queries
    const { data: transfers, isLoading } = api.transfers.list.useQuery({
        outletId,
        direction: "all"
    });

    const { data: outlets } = api.outlets.list.useQuery({ tenantId });
    const { data: products } = api.products.list.useQuery({ outletId });

    // Mutations
    const createTransfer = api.transfers.create.useMutation({
        onSuccess: () => {
            toast.success("Transfer request created");
            setIsCreateOpen(false);
            setItems([]);
            setNotes("");
            utils.transfers.list.invalidate();
        },
        onError: (err) => toast.error(err.message)
    });

    const approveTransfer = api.transfers.approve.useMutation({
        onSuccess: () => {
            toast.success("Transfer approved");
            utils.transfers.list.invalidate();
        }
    });

    const rejectTransfer = api.transfers.reject.useMutation({
        onSuccess: () => {
            toast.success("Transfer rejected");
            utils.transfers.list.invalidate();
        }
    });

    const markShipped = api.transfers.markShipped.useMutation({
        onSuccess: () => {
            toast.success("Transfer marked as shipped");
            utils.transfers.list.invalidate();
        }
    });

    const confirmReceipt = api.transfers.confirmReceipt.useMutation({
        onSuccess: () => {
            toast.success("Receipt confirmed");
            utils.transfers.list.invalidate();
        }
    });

    const otherOutlets = outlets?.filter(o => o.id !== outletId) || [];

    const addItem = () => {
        const product = products?.find(p => p.id === selectedProduct);
        if (!product || qty <= 0) return;

        setItems([...items, {
            productId: product.id,
            productName: product.name,
            qtyRequested: qty
        }]);
        setSelectedProduct("");
        setQty(1);
    };

    const handleCreate = () => {
        if (!selectedOutlet || items.length === 0) {
            toast.error("Select outlet and add items");
            return;
        }

        createTransfer.mutate({
            fromOutletId: selectedOutlet,
            toOutletId: outletId,
            items,
            notes: notes || undefined
        });
    };

    const handleApprove = (transfer: any) => {
        approveTransfer.mutate({
            transferId: transfer.id,
            items: transfer.items.map((i: any) => ({
                id: i.id,
                qtyApproved: i.qtyRequested // Approve full quantity
            }))
        });
    };

    const handleShip = (transferId: string) => {
        markShipped.mutate({ transferId });
    };

    const handleReceive = (transfer: any) => {
        confirmReceipt.mutate({
            transferId: transfer.id,
            items: transfer.items.map((i: any) => ({
                id: i.id,
                qtyReceived: i.qtyApproved || i.qtyRequested
            }))
        });
    };

    const incomingTransfers = transfers?.filter(t => t.toOutletId === outletId) || [];
    const outgoingTransfers = transfers?.filter(t => t.fromOutletId === outletId) || [];

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Stock Transfers</h1>
                    <p className="text-muted-foreground">Request and manage stock transfers between outlets</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Request Transfer
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Request Stock Transfer</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Request From Outlet</Label>
                                <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select source outlet" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {otherOutlets.map(outlet => (
                                            <SelectItem key={outlet.id} value={outlet.id}>
                                                {outlet.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Add Products</Label>
                                <div className="flex gap-2">
                                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Select product" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {products?.map(product => (
                                                <SelectItem key={product.id} value={product.id}>
                                                    {product.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="number"
                                        value={qty}
                                        onChange={(e) => setQty(Number(e.target.value))}
                                        className="w-20"
                                        min={1}
                                    />
                                    <Button type="button" variant="outline" onClick={addItem}>
                                        Add
                                    </Button>
                                </div>
                            </div>

                            {items.length > 0 && (
                                <div className="border rounded-lg p-3 space-y-2">
                                    {items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-sm">
                                            <span>{item.productName}</span>
                                            <span className="font-medium">{item.qtyRequested}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Notes (optional)</Label>
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Reason for transfer..."
                                />
                            </div>

                            <Button onClick={handleCreate} className="w-full" disabled={createTransfer.isPending}>
                                {createTransfer.isPending ? "Creating..." : "Create Request"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="incoming" className="w-full">
                <TabsList>
                    <TabsTrigger value="incoming">
                        Incoming ({incomingTransfers.length})
                    </TabsTrigger>
                    <TabsTrigger value="outgoing">
                        Outgoing ({outgoingTransfers.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="incoming" className="space-y-4">
                    {incomingTransfers.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No incoming transfers</p>
                            </CardContent>
                        </Card>
                    ) : (
                        incomingTransfers.map(transfer => (
                            <TransferCard
                                key={transfer.id}
                                transfer={transfer}
                                isIncoming={true}
                                currentOutletId={outletId}
                                onReceive={() => handleReceive(transfer)}
                                isReceiving={confirmReceipt.isPending}
                            />
                        ))
                    )}
                </TabsContent>

                <TabsContent value="outgoing" className="space-y-4">
                    {outgoingTransfers.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No outgoing transfers</p>
                            </CardContent>
                        </Card>
                    ) : (
                        outgoingTransfers.map(transfer => (
                            <TransferCard
                                key={transfer.id}
                                transfer={transfer}
                                isIncoming={false}
                                currentOutletId={outletId}
                                onApprove={() => handleApprove(transfer)}
                                onReject={() => {
                                    const reason = prompt("Rejection reason:");
                                    if (reason) rejectTransfer.mutate({ transferId: transfer.id, reason });
                                }}
                                onShip={() => handleShip(transfer.id)}
                                isApproving={approveTransfer.isPending}
                                isShipping={markShipped.isPending}
                            />
                        ))
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function TransferCard({
    transfer,
    isIncoming,
    currentOutletId,
    onApprove,
    onReject,
    onShip,
    onReceive,
    isApproving,
    isShipping,
    isReceiving
}: {
    transfer: any;
    isIncoming: boolean;
    currentOutletId: string;
    onApprove?: () => void;
    onReject?: () => void;
    onShip?: () => void;
    onReceive?: () => void;
    isApproving?: boolean;
    isShipping?: boolean;
    isReceiving?: boolean;
}) {
    const status = transfer.status as TransferStatus;
    const canApprove = !isIncoming && status === "REQUESTED";
    const canShip = !isIncoming && status === "APPROVED";
    const canReceive = isIncoming && status === "SHIPPED";

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">{transfer.fromOutlet.name}</span>
                            <ArrowRight className="w-4 h-4" />
                            <span className="font-medium">{transfer.toOutlet.name}</span>
                        </div>
                    </div>
                    <Badge className={statusColors[status]}>{status}</Badge>
                </div>
                <CardDescription>
                    Ref: {transfer.id.slice(-8)} • {new Date(transfer.createdAt).toLocaleDateString()}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="border rounded-lg divide-y">
                    {transfer.items.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between p-3 text-sm">
                            <span>{item.productName}</span>
                            <div className="flex items-center gap-4">
                                <span>Req: {item.qtyRequested}</span>
                                {item.qtyApproved !== null && <span className="text-blue-400">Appr: {item.qtyApproved}</span>}
                                {item.qtyReceived !== null && <span className="text-green-400">Recv: {item.qtyReceived}</span>}
                            </div>
                        </div>
                    ))}
                </div>

                {transfer.notes && (
                    <p className="text-sm text-muted-foreground">Notes: {transfer.notes}</p>
                )}

                <div className="flex gap-2 justify-end">
                    {canApprove && (
                        <>
                            <Button variant="outline" size="sm" onClick={onReject}>
                                <X className="w-4 h-4 mr-1" /> Reject
                            </Button>
                            <Button size="sm" onClick={onApprove} disabled={isApproving}>
                                <Check className="w-4 h-4 mr-1" /> Approve
                            </Button>
                        </>
                    )}
                    {canShip && (
                        <Button size="sm" onClick={onShip} disabled={isShipping}>
                            <Truck className="w-4 h-4 mr-1" /> Mark Shipped
                        </Button>
                    )}
                    {canReceive && (
                        <Button size="sm" onClick={onReceive} disabled={isReceiving}>
                            <PackageCheck className="w-4 h-4 mr-1" /> Confirm Receipt
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Plus, Search, Eye, CheckCircle, XCircle, Truck, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ProcurementPage() {
    const [search, setSearch] = useState("");
    const [selectedOutletId, setSelectedOutletId] = useState<string>("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [viewingPO, setViewingPO] = useState<any>(null);
    const [isReceiveOpen, setIsReceiveOpen] = useState(false);

    // Create PO State
    const [newPO, setNewPO] = useState<{ supplierId: string; items: { productId: string; qty: number; unitCost: number }[] }>({
        supplierId: "",
        items: []
    });

    // Receive PO State
    const [receiveItems, setReceiveItems] = useState<{ itemId: string; receivedQty: number }[]>([]);

    const utils = trpc.useContext();
    const { data: outlets } = trpc.outlets.list.useQuery();

    // Default to first outlet
    if (outlets && outlets.length > 0 && !selectedOutletId) {
        setSelectedOutletId(outlets[0].id);
    }

    const { data: orders, isLoading } = trpc.procurement.listOrders.useQuery(
        { outletId: selectedOutletId },
        { enabled: !!selectedOutletId }
    );

    const { data: suppliers } = trpc.suppliers.list.useQuery();
    const { data: products } = trpc.products.list.useQuery(
        { outletId: selectedOutletId },
        { enabled: !!selectedOutletId }
    );

    const createMutation = trpc.procurement.createOrder.useMutation({
        onSuccess: () => {
            toast.success("Purchase Order created");
            setIsCreateOpen(false);
            setNewPO({ supplierId: "", items: [] });
            utils.procurement.listOrders.invalidate();
        },
        onError: (err) => toast.error(err.message),
    });

    const receiveMutation = trpc.procurement.receiveOrder.useMutation({
        onSuccess: () => {
            toast.success("Order received and stock updated");
            setIsReceiveOpen(false);
            setViewingPO(null);
            utils.procurement.listOrders.invalidate();
            utils.products.list.invalidate(); // Update stock levels
        },
        onError: (err) => toast.error(err.message),
    });

    const handleAddItem = () => {
        setNewPO(prev => ({
            ...prev,
            items: [...prev.items, { productId: "", qty: 1, unitCost: 0 }]
        }));
    };

    const handleRemoveItem = (index: number) => {
        setNewPO(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...newPO.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setNewPO(prev => ({ ...prev, items: newItems }));
    };

    const handleCreateSubmit = () => {
        if (!newPO.supplierId || newPO.items.length === 0) {
            toast.error("Please select a supplier and add items");
            return;
        }
        createMutation.mutate({
            outletId: selectedOutletId,
            supplierId: newPO.supplierId,
            status: 'SENT', // Auto-send for now
            items: newPO.items
        });
    };

    const openReceiveDialog = (po: any) => {
        setViewingPO(po);
        setReceiveItems(po.items.map((item: any) => ({ itemId: item.id, receivedQty: item.qty }))); // Default to full receive
        setIsReceiveOpen(true);
    };

    const handleReceiveSubmit = () => {
        if (!viewingPO) return;
        receiveMutation.mutate({
            orderId: viewingPO.id,
            receivedItems: receiveItems
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'bg-gray-100 text-gray-800';
            case 'SENT': return 'bg-blue-100 text-blue-800';
            case 'PARTIALLY_RECEIVED': return 'bg-orange-100 text-orange-800';
            case 'RECEIVED': return 'bg-green-100 text-green-800';
            case 'CANCELLED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <PageTransition>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Procurement</h1>
                        <p className="text-muted-foreground">Manage purchase orders and incoming stock.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Select value={selectedOutletId} onValueChange={setSelectedOutletId}>
                            <SelectTrigger className="w-[200px] bg-white">
                                <SelectValue placeholder="Select Outlet" />
                            </SelectTrigger>
                            <SelectContent>
                                {outlets?.map((outlet) => (
                                    <SelectItem key={outlet.id} value={outlet.id}>{outlet.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={() => setIsCreateOpen(true)} disabled={!selectedOutletId} className="bg-gray-900 text-white">
                            <Plus className="mr-2 h-4 w-4" /> New Order
                        </Button>
                    </div>
                </div>

                {/* Orders List */}
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-lg" />
                        ))}
                    </div>
                ) : (
                    <StaggerContainer className="space-y-4" staggerDelay={0.05}>
                        {orders?.map((po) => (
                            <StaggerItem key={po.id}>
                                <Card className="border-none shadow-sm bg-white ring-1 ring-gray-200 hover:ring-gray-300 transition-all">
                                    <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-full ${po.status === 'RECEIVED' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                                <Truck className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-gray-900">PO #{po.id.slice(-6).toUpperCase()}</h3>
                                                    <Badge className={getStatusColor(po.status)} variant="secondary">{po.status.replace('_', ' ')}</Badge>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {po.supplier?.name} • {new Date(po.createdAt).toLocaleDateString()} • {po.items.length} Items
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right mr-4">
                                                <div className="text-lg font-bold text-gray-900">
                                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(po.totalAmount))}
                                                </div>
                                                <div className="text-xs text-gray-500">Total Value</div>
                                            </div>
                                            {po.status !== 'RECEIVED' && po.status !== 'CANCELLED' && (
                                                <Button onClick={() => openReceiveDialog(po)} variant="outline" className="border-green-200 text-green-700 hover:bg-green-50">
                                                    <CheckCircle className="mr-2 h-4 w-4" /> Receive
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="icon">
                                                <Eye className="h-4 w-4 text-gray-500" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </StaggerItem>
                        ))}
                        {orders?.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                No purchase orders found. Create one to get started.
                            </div>
                        )}
                    </StaggerContainer>
                )}

                {/* Create PO Dialog */}
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Create Purchase Order</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Supplier</Label>
                                <Select
                                    value={newPO.supplierId}
                                    onValueChange={(val) => setNewPO(prev => ({ ...prev, supplierId: val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Supplier" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {suppliers?.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label>Items</Label>
                                    <Button size="sm" variant="outline" onClick={handleAddItem}>
                                        <Plus className="h-3 w-3 mr-1" /> Add Item
                                    </Button>
                                </div>
                                <div className="border rounded-md overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Product</TableHead>
                                                <TableHead className="w-[100px]">Qty</TableHead>
                                                <TableHead className="w-[120px]">Unit Cost</TableHead>
                                                <TableHead className="w-[100px]">Total</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {newPO.items.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>
                                                        <Select
                                                            value={item.productId}
                                                            onValueChange={(val) => handleItemChange(index, 'productId', val)}
                                                        >
                                                            <SelectTrigger className="h-8">
                                                                <SelectValue placeholder="Select Product" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {products
                                                                    ?.filter(p => !newPO.supplierId || p.supplierId === newPO.supplierId || !p.supplierId) // Filter by supplier if selected
                                                                    .map((p) => (
                                                                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.unit})</SelectItem>
                                                                    ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            className="h-8"
                                                            min="0"
                                                            value={item.qty}
                                                            onChange={(e) => handleItemChange(index, 'qty', Number(e.target.value))}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            className="h-8"
                                                            min="0"
                                                            value={item.unitCost}
                                                            onChange={(e) => handleItemChange(index, 'unitCost', Number(e.target.value))}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        ₹{(item.qty * item.unitCost).toFixed(2)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleRemoveItem(index)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {newPO.items.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center text-gray-500 py-4">
                                                        No items added.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                            <div className="flex justify-end text-lg font-bold">
                                Total: ₹{newPO.items.reduce((sum, item) => sum + (item.qty * item.unitCost), 0).toFixed(2)}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateSubmit} disabled={createMutation.isPending}>
                                {createMutation.isPending ? "Creating..." : "Create Order"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Receive PO Dialog */}
                <Dialog open={isReceiveOpen} onOpenChange={setIsReceiveOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Receive Order #{viewingPO?.id.slice(-6).toUpperCase()}</DialogTitle>
                            <DialogDescription>Verify received quantities. This will update your stock levels.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Ordered</TableHead>
                                        <TableHead>Received</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {viewingPO?.items.map((item: any) => {
                                        const receiveItem = receiveItems.find(r => r.itemId === item.id);
                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.productName}</TableCell>
                                                <TableCell>{item.qty}</TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        className="w-24"
                                                        value={receiveItem?.receivedQty || 0}
                                                        onChange={(e) => {
                                                            const val = Number(e.target.value);
                                                            setReceiveItems(prev => prev.map(r => r.itemId === item.id ? { ...r, receivedQty: val } : r));
                                                        }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsReceiveOpen(false)}>Cancel</Button>
                            <Button onClick={handleReceiveSubmit} disabled={receiveMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">
                                {receiveMutation.isPending ? "Processing..." : "Confirm Receipt"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </PageTransition>
    );
}

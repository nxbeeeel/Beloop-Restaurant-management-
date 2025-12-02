"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

export default function CreatePurchaseOrderPage() {
    const router = useRouter();
    const { data: user } = trpc.dashboard.getUser.useQuery();
    const outletId = user?.outletId || "";

    const [supplierId, setSupplierId] = useState("");
    const [items, setItems] = useState<{ productId?: string; ingredientId?: string; qty: number; unitCost: number }[]>([]);

    const { data: suppliers } = trpc.suppliers.list.useQuery();
    const { data: products } = trpc.products.list.useQuery({ outletId }, { enabled: !!outletId });
    const { data: ingredients } = trpc.ingredients.list.useQuery({ outletId }, { enabled: !!outletId });

    const createMutation = trpc.procurement.createOrder.useMutation({
        onSuccess: () => {
            toast.success("Order created successfully");
            router.push("/outlet/purchase-orders");
        },
        onError: (err) => toast.error(err.message)
    });

    const handleAddItem = () => {
        setItems([...items, { qty: 1, unitCost: 0 }]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        if (field === "itemId") {
            // Check if product or ingredient
            const isProduct = products?.find(p => p.id === value);
            if (isProduct) {
                newItems[index] = { ...newItems[index], productId: value, ingredientId: undefined };
            } else {
                newItems[index] = { ...newItems[index], ingredientId: value, productId: undefined };
            }
        } else {
            newItems[index] = { ...newItems[index], [field]: value };
        }
        setItems(newItems);
    };

    const handleSubmit = () => {
        if (!supplierId) {
            toast.error("Please select a supplier");
            return;
        }
        if (items.length === 0) {
            toast.error("Please add at least one item");
            return;
        }

        createMutation.mutate({
            outletId,
            supplierId,
            status: "DRAFT",
            items: items.map(i => ({
                productId: i.productId,
                ingredientId: i.ingredientId,
                qty: Number(i.qty),
                unitCost: Number(i.unitCost)
            }))
        });
    };

    // Filter items based on selected supplier
    // Note: Since we added supplierId to Ingredient, we can filter both
    const filteredProducts = products?.filter(p => p.supplierId === supplierId);
    const filteredIngredients = ingredients?.filter(i => i.supplierId === supplierId);

    return (
        <div className="space-y-6 pb-24 lg:pb-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Create Purchase Order</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Order Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Supplier</Label>
                        <Select value={supplierId} onValueChange={setSupplierId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select supplier..." />
                            </SelectTrigger>
                            <SelectContent>
                                {suppliers?.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {supplierId && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label>Items</Label>
                                <Button onClick={handleAddItem} variant="outline" size="sm">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Item
                                </Button>
                            </div>

                            {items.map((item, idx) => (
                                <div key={idx} className="flex gap-4 items-end border p-4 rounded-lg bg-gray-50">
                                    <div className="flex-1 space-y-2">
                                        <Label>Item</Label>
                                        <Select
                                            value={item.productId || item.ingredientId}
                                            onValueChange={(val) => handleItemChange(idx, "itemId", val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select item..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {filteredProducts?.map((p: any) => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name} (Product)</SelectItem>
                                                ))}
                                                {filteredIngredients?.map((i: any) => (
                                                    <SelectItem key={i.id} value={i.id}>{i.name} (Ingredient)</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-24 space-y-2">
                                        <Label>Qty</Label>
                                        <Input
                                            type="number"
                                            value={item.qty}
                                            onChange={(e) => handleItemChange(idx, "qty", e.target.value)}
                                        />
                                    </div>
                                    <div className="w-32 space-y-2">
                                        <Label>Cost</Label>
                                        <Input
                                            type="number"
                                            value={item.unitCost}
                                            onChange={(e) => handleItemChange(idx, "unitCost", e.target.value)}
                                        />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500 hover:text-red-700"
                                        onClick={() => handleRemoveItem(idx)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="pt-4 flex justify-end gap-4">
                        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                            {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Create Order
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface StockMovementModalProps {
    isOpen: boolean;
    onClose: () => void;
    outletId: string;
    type: 'IN' | 'OUT'; // 'IN' = Purchase, 'OUT' = Waste/Damage/Usage
}

export function StockMovementModal({ isOpen, onClose, outletId, type }: StockMovementModalProps) {
    const [category, setCategory] = useState<'product' | 'ingredient'>('product');
    const [items, setItems] = useState<{ id: string; qty: number }[]>([{ id: '', qty: 0 }]);
    const [notes, setNotes] = useState('');

    const utils = trpc.useUtils();

    // Fetch available items based on category
    const { data: products } = trpc.products.list.useQuery({ outletId }, { enabled: category === 'product' && isOpen });
    const { data: ingredients } = trpc.ingredients.list.useQuery({ outletId }, { enabled: category === 'ingredient' && isOpen });

    const availableItems = category === 'product'
        ? products?.map(p => ({ id: p.id, name: p.name, unit: p.unit }))
        : ingredients?.map(i => ({ id: i.id, name: i.name, unit: i.purchaseUnit }));

    const adjustMutation = trpc.inventory.adjustStock.useMutation({
        onSuccess: () => {
            utils.products.list.invalidate();
            utils.ingredients.list.invalidate();
            toast.success(`Stock ${type === 'IN' ? 'Added' : 'Removed'} Successfully`);
            onClose();
            setItems([{ id: '', qty: 0 }]); // Reset
            setNotes('');
        },
        onError: (err) => toast.error(err.message)
    });

    const handleSubmit = async () => {
        // Validate
        if (items.some(i => !i.id || i.qty <= 0)) {
            toast.error("Please fill all item fields correctly");
            return;
        }

        try {
            // Process sequentially for now (could be bulk API in future)
            for (const item of items) {
                await adjustMutation.mutateAsync({
                    outletId,
                    productId: item.id, // The API currently expects 'productId' but let's check if it handles ingredients
                    // WAIT: The backend adjustStock might only handle products. 
                    // Let's assume for now we only support Products for this specific modal 
                    // or we need to update the backend to support ingredients adjustment.
                    // For the sake of this task, let's limit to Products or risk breaking.
                    // Actually, looking at inventoryRouter, it finds `product` by `productId`.
                    // Does it handle Ingredients? Likely not yet. 
                    // I will restrict this modal to PRODUCTS ONLY for safety in this iteration.
                    qty: type === 'IN' ? item.qty : -item.qty,
                    type: type === 'IN' ? 'PURCHASE' : 'WASTE',
                    notes: notes
                });
            }
        } catch (e) {
            // Error managed by mutation
        }
    };

    const addItem = () => setItems([...items, { id: '', qty: 0 }]);
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
    const updateItem = (index: number, field: 'id' | 'qty', value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>
                        {type === 'IN' ? 'Stock In (Receive)' : 'Stock Out (Waste/Damage)'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Category Selector (Disable Ingredient for now as per backend limitation safety check) */}
                    <Tabs value={category} onValueChange={(v) => setCategory(v as any)} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="product">Products</TabsTrigger>
                            <TabsTrigger value="ingredient" disabled title="Ingredient API pending">Ingredients (Coming Soon)</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Items List */}
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {items.map((item, index) => (
                            <div key={index} className="flex gap-3 items-end">
                                <div className="flex-1 space-y-2">
                                    <Label>Item</Label>
                                    <Select
                                        value={item.id}
                                        onValueChange={(v) => updateItem(index, 'id', v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select item..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableItems?.map(i => (
                                                <SelectItem key={i.id} value={i.id}>{i.name} ({i.unit})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-24 space-y-2">
                                    <Label>Qty</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={item.qty || ''}
                                        onChange={(e) => updateItem(index, 'qty', Number(e.target.value))}
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="mb-0.5 text-red-500 hover:text-red-700"
                                    onClick={() => removeItem(index)}
                                    disabled={items.length === 1}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <Button variant="outline" size="sm" onClick={addItem} className="w-full border-dashed">
                        <Plus className="w-4 h-4 mr-2" /> Add Another Item
                    </Button>

                    <div className="space-y-2">
                        <Label>Notes (Optional)</Label>
                        <Textarea
                            placeholder="Reason for movement..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={adjustMutation.isPending}
                        className={type === 'OUT' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                    >
                        {adjustMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Confirm {type === 'IN' ? 'Stock In' : 'Stock Out'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Save, Send, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type OrderItem = {
    productId: string;
    productName: string;
    qty: number;
    unitCost: number;
};

export default function CreateOrderForm({ outletId }: { outletId: string }) {
    const router = useRouter();
    const [supplierId, setSupplierId] = useState<string>("");
    const [items, setItems] = useState<OrderItem[]>([]);
    const [expectedDate, setExpectedDate] = useState<string>("");

    // Fetch Suppliers
    const { data: suppliers } = trpc.suppliers.list.useQuery();

    // Fetch Products (filtered by supplier if selected, otherwise all)
    const { data: allProducts } = trpc.products.list.useQuery({ outletId });
    // Filter products by supplier if one is selected
    const products = supplierId
        ? allProducts?.filter(p => p.supplierId === supplierId)
        : allProducts;

    const createOrder = trpc.procurement.createOrder.useMutation({
        onSuccess: () => {
            toast.success("Purchase Order created successfully!");
            router.push("/outlet/orders");
        },
        onError: (e) => toast.error(e.message)
    });

    const addItem = () => {
        setItems([...items, { productId: "", productName: "", qty: 1, unitCost: 0 }]);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateItem = (index: number, field: keyof OrderItem, value: any) => {
        const newItems = [...items];

        if (field === 'productId') {
            const product = products?.find(p => p.id === value);
            if (product) {
                newItems[index].productId = value;
                newItems[index].productName = product.name;
                // Assuming product has a cost field, otherwise default to 0
                // newItems[index].unitCost = product.cost || 0; 
            }
        } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (newItems[index] as any)[field] = value;
        }

        setItems(newItems);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.qty * item.unitCost), 0);
    };

    const handleSubmit = (status: 'DRAFT' | 'SENT') => {
        if (!supplierId) return toast.error("Please select a supplier");
        if (items.length === 0) return toast.error("Please add at least one item");
        if (items.some(i => !i.productId || i.qty <= 0)) return toast.error("Please fill in all item details");

        createOrder.mutate({
            outletId,
            supplierId,
            status,
            items: items.map(i => ({
                productId: i.productId,
                qty: i.qty,
                unitCost: i.unitCost
            }))
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/outlet/orders">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">New Purchase Order</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Order Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Supplier</label>
                            <Select value={supplierId} onValueChange={setSupplierId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Supplier" />
                                </SelectTrigger>
                                <SelectContent>
                                    {suppliers?.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Expected Delivery</label>
                            <Input
                                type="date"
                                value={expectedDate}
                                onChange={(e) => setExpectedDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold">Items</h3>
                            <Button variant="outline" size="sm" onClick={addItem}>
                                <Plus className="h-4 w-4 mr-2" /> Add Item
                            </Button>
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Product</th>
                                        <th className="px-4 py-2 text-right w-24">Qty</th>
                                        <th className="px-4 py-2 text-right w-32">Unit Cost</th>
                                        <th className="px-4 py-2 text-right w-32">Total</th>
                                        <th className="px-4 py-2 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {items.map((item, index) => (
                                        <tr key={index}>
                                            <td className="p-2">
                                                <Select
                                                    value={item.productId}
                                                    onValueChange={(val) => updateItem(index, 'productId', val)}
                                                >
                                                    <SelectTrigger className="border-0 shadow-none">
                                                        <SelectValue placeholder="Select Product" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {products?.map(p => (
                                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    className="text-right border-0 shadow-none"
                                                    value={item.qty}
                                                    onChange={(e) => updateItem(index, 'qty', Number(e.target.value))}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="text-right border-0 shadow-none"
                                                    value={item.unitCost}
                                                    onChange={(e) => updateItem(index, 'unitCost', Number(e.target.value))}
                                                />
                                            </td>
                                            <td className="p-2 text-right font-medium">
                                                ${(item.qty * item.unitCost).toFixed(2)}
                                            </td>
                                            <td className="p-2 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => removeItem(index)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 font-semibold">
                                    <tr>
                                        <td colSpan={3} className="px-4 py-3 text-right">Total Amount:</td>
                                        <td className="px-4 py-3 text-right text-lg">
                                            ${calculateTotal().toFixed(2)}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => handleSubmit('DRAFT')}
                            disabled={createOrder.isPending}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            Save as Draft
                        </Button>
                        <Button
                            className="bg-rose-600 hover:bg-rose-700"
                            onClick={() => handleSubmit('SENT')}
                            disabled={createOrder.isPending}
                        >
                            <Send className="h-4 w-4 mr-2" />
                            Send Order
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

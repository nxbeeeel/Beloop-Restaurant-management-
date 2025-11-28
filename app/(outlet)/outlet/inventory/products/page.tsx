"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Package } from "lucide-react";
import { useOutlet } from "@/hooks/use-outlet";

interface Supplier {
    id: string;
    name: string;
}

interface Product {
    id: string;
    name: string;
    sku: string;
    unit: string;
    currentStock: number;
    minStock: number;
    supplierId: string | null;
    supplier: Supplier | null;
}

export default function ProductsPage() {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const { outletId, isLoading: userLoading } = useOutlet();

    const { data: products, refetch } = trpc.products.list.useQuery(
        { outletId: outletId || "" },
        { enabled: !!outletId }
    );

    const { data: suppliers } = trpc.suppliers.list.useQuery();

    if (userLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!outletId) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">No outlet assigned</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Products</h1>
                    <p className="text-gray-500">Manage your inventory items and suppliers</p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="shadow-lg">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Product
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Product</DialogTitle>
                        </DialogHeader>
                        <ProductForm
                            outletId={outletId}
                            suppliers={suppliers || []}
                            onSuccess={() => {
                                setIsAddOpen(false);
                                refetch();
                            }}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        All Products
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground font-medium">
                                <tr>
                                    <th className="p-4 text-left">Name</th>
                                    <th className="p-4 text-left">SKU</th>
                                    <th className="p-4 text-left">Unit</th>
                                    <th className="p-4 text-right">Current Stock</th>
                                    <th className="p-4 text-right">Min Stock</th>
                                    <th className="p-4 text-left">Supplier</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {products?.map((product: Product) => (
                                    <tr key={product.id} className="hover:bg-muted/50">
                                        <td className="p-4 font-medium">{product.name}</td>
                                        <td className="p-4 text-gray-500">{product.sku}</td>
                                        <td className="p-4">{product.unit}</td>
                                        <td className="p-4 text-right font-medium">{product.currentStock}</td>
                                        <td className="p-4 text-right text-gray-500">{product.minStock}</td>
                                        <td className="p-4">
                                            {product.supplier ? (
                                                <span className="text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                                    {product.supplier.name}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-sm">No supplier</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" onClick={() => setEditingProduct(product as Product)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Edit Product</DialogTitle>
                                                    </DialogHeader>
                                                    <ProductForm
                                                        outletId={outletId}
                                                        suppliers={suppliers || []}
                                                        product={editingProduct}
                                                        onSuccess={() => {
                                                            setEditingProduct(null);
                                                            refetch();
                                                        }}
                                                    />
                                                </DialogContent>
                                            </Dialog>
                                        </td>
                                    </tr>
                                ))}
                                {(!products || products.length === 0) && (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-gray-500">
                                            No products yet. Add your first product above!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function ProductForm({
    outletId,
    suppliers,
    product,
    onSuccess
}: {
    outletId: string;
    suppliers: Supplier[];
    product?: Product | null;
    onSuccess: () => void;
}) {
    const [name, setName] = useState(product?.name || "");
    const [sku, setSku] = useState(product?.sku || "");
    const [unit, setUnit] = useState(product?.unit || "");
    const [minStock, setMinStock] = useState(product?.minStock?.toString() || "0");
    const [supplierId, setSupplierId] = useState<string>(product?.supplierId || "");

    const utils = trpc.useUtils();

    const createMutation = trpc.products.create.useMutation({
        onSuccess: () => {
            toast.success("Product added successfully!");
            utils.products.list.invalidate();
            onSuccess();
        },
        onError: (e) => toast.error(e.message)
    });

    const updateMutation = trpc.products.update.useMutation({
        onSuccess: () => {
            toast.success("Product updated successfully!");
            utils.products.list.invalidate();
            onSuccess();
        },
        onError: (e) => toast.error(e.message)
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !sku || !unit) {
            toast.error("Please fill all required fields");
            return;
        }

        if (product) {
            updateMutation.mutate({
                id: product.id,
                name,
                unit,
                minStock: parseFloat(minStock) || 0,
                supplierId: supplierId || null
            });
        } else {
            createMutation.mutate({
                outletId,
                name,
                sku,
                unit,
                minStock: parseFloat(minStock) || 0,
                supplierId: supplierId || undefined
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="text-sm font-medium">Product Name *</label>
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Tomatoes"
                    required
                />
            </div>

            {!product && (
                <div>
                    <label className="text-sm font-medium">SKU *</label>
                    <Input
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="e.g., VEG-001"
                        required
                    />
                </div>
            )}

            <div>
                <label className="text-sm font-medium">Unit *</label>
                <Input
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="e.g., kg, pcs, liters"
                    required
                />
            </div>

            <div>
                <label className="text-sm font-medium">Minimum Stock Level</label>
                <Input
                    type="number"
                    step="0.01"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    placeholder="0"
                />
            </div>

            <div>
                <label className="text-sm font-medium">Supplier</label>
                <Select value={supplierId || "NONE"} onValueChange={(val) => setSupplierId(val === "NONE" ? "" : val)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select supplier (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="NONE">No supplier</SelectItem>
                        {suppliers.map((supplier: Supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending || updateMutation.isPending}
            >
                {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : product
                        ? "Update Product"
                        : "Add Product"}
            </Button>
        </form>
    );
}

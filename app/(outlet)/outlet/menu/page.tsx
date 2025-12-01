"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Loader2, UtensilsCrossed, MoreHorizontal, Pencil, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Product {
    id: string;
    name: string;
    price: number;
    sku: string;
    unit: string;
    category?: { id: string; name: string } | null;
    description?: string | null;
    currentStock: number;
}

export default function MenuPage() {
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Product>>({
        name: "", unit: "portion", price: 0, sku: "", description: ""
    });

    const { data: user } = trpc.dashboard.getUser.useQuery();
    const outletId = user?.outletId || "";

    const utils = trpc.useUtils();
    const { data: products, isLoading } = trpc.products.list.useQuery(
        { outletId },
        { enabled: !!outletId }
    );

    // Mutations
    const createMutation = trpc.products.create.useMutation({
        onSuccess: () => {
            utils.products.list.invalidate();
            setIsAddOpen(false);
            resetForm();
            toast.success("Item added to menu");
        },
        onError: (err) => toast.error(err.message)
    });

    const updateMutation = trpc.products.update.useMutation({
        onSuccess: () => {
            utils.products.list.invalidate();
            setEditingProduct(null);
            resetForm();
            toast.success("Menu item updated");
        },
        onError: (err) => toast.error(err.message)
    });

    const resetForm = () => {
        setFormData({ name: "", unit: "portion", price: 0, sku: "", description: "" });
    };

    const handleSave = () => {
        if (!formData.name || !formData.sku) {
            toast.error("Name and SKU are required");
            return;
        }

        if (editingProduct) {
            updateMutation.mutate({
                id: editingProduct.id,
                name: formData.name,
                price: formData.price,
                unit: formData.unit,
                description: formData.description || undefined,
            });
        } else {
            createMutation.mutate({
                outletId,
                name: formData.name,
                sku: formData.sku,
                unit: formData.unit || "portion",
                minStock: 0, // Default for menu items
                price: formData.price || 0,
                description: formData.description || undefined,
                applyToAllOutlets: false
            });
        }
    };

    const openEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            sku: product.sku,
            price: product.price,
            unit: product.unit,
            description: product.description
        });
        setIsAddOpen(true);
    };

    const filteredProducts = products?.map(p => ({
        ...p,
        price: Number(p.price)
    })).filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase());
        // const matchesCategory = categoryFilter === "all" || p.categoryId === categoryFilter;
        return matchesSearch;
    });

    return (
        <div className="space-y-6 pb-24 lg:pb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">Menu Management</h1>
                    <p className="text-gray-500 text-sm lg:text-base">Manage your products, prices, and menu details.</p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={(open) => {
                    setIsAddOpen(open);
                    if (!open) {
                        setEditingProduct(null);
                        resetForm();
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm">
                            <Plus className="w-4 h-4 mr-2" /> Add New Item
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{editingProduct ? "Edit Menu Item" : "Add New Menu Item"}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Item Name</label>
                                    <Input
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Chicken Burger"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">SKU / Code</label>
                                    <Input
                                        value={formData.sku}
                                        onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                        placeholder="e.g. BURG-001"
                                        disabled={!!editingProduct} // SKU immutable for now
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Description</label>
                                <Input
                                    value={formData.description || ""}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Brief description for menu..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Price (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                                        <Input
                                            type="number"
                                            className="pl-7"
                                            value={formData.price}
                                            onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Unit</label>
                                    <Input
                                        value={formData.unit}
                                        onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                        placeholder="e.g. portion, pc"
                                    />
                                </div>
                            </div>

                            <Button
                                onClick={handleSave}
                                disabled={createMutation.isPending || updateMutation.isPending}
                                className="w-full bg-violet-600 hover:bg-violet-700"
                            >
                                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                {editingProduct ? "Update Item" : "Create Item"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filters & Table */}
            <Card className="border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search menu items..."
                            className="pl-9 bg-white border-gray-200 focus:border-violet-500 focus:ring-violet-500"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    {/* <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[180px] bg-white">
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                             Categories would be mapped here 
                        </SelectContent>
                    </Select> */}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100 uppercase tracking-wider text-xs">
                            <tr>
                                <th className="p-4 w-16">Image</th>
                                <th className="p-4">Item Details</th>
                                <th className="p-4">Category</th>
                                <th className="p-4">Price</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-violet-500" />
                                    </td>
                                </tr>
                            ) : filteredProducts?.map(product => (
                                <tr key={product.id} className="hover:bg-gray-50/80 transition-colors group">
                                    <td className="p-4">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                                            <ImageIcon size={20} />
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-gray-900">{product.name}</div>
                                        <div className="text-xs text-gray-500 font-mono mt-0.5">{product.sku}</div>
                                        {product.description && (
                                            <p className="text-xs text-gray-400 mt-1 line-clamp-1">{product.description}</p>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {product.category ? (
                                            <Badge variant="outline" className="font-normal text-gray-600">
                                                {product.category.name}
                                            </Badge>
                                        ) : (
                                            <span className="text-gray-400 text-xs italic">Uncategorized</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className="font-bold text-gray-900">₹{product.price.toLocaleString()}</span>
                                        <span className="text-gray-400 text-xs ml-1">/ {product.unit}</span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => openEdit(product)}>
                                                    <Pencil className="w-4 h-4 mr-2" /> Edit Details
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-red-600 focus:text-red-600">
                                                    <Trash2 className="w-4 h-4 mr-2" /> Delete Item
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))}
                            {filteredProducts?.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-gray-500">
                                        <UtensilsCrossed className="w-12 h-12 mx-auto text-gray-200 mb-3" />
                                        <p className="font-medium">No menu items found</p>
                                        <p className="text-xs mt-1">Add a new item to get started</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

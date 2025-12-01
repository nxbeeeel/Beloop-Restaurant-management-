"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Plus, Search, Pencil, Trash2, Package, ArrowRightLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/animations";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function ProductsPage() {
    const [search, setSearch] = useState("");
    const [selectedOutletId, setSelectedOutletId] = useState<string>("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isAdjustOpen, setIsAdjustOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [adjustingProduct, setAdjustingProduct] = useState<any>(null);

    const utils = trpc.useContext();
    const { data: outlets } = trpc.outlets.list.useQuery();

    // Default to first outlet if not selected
    if (outlets && outlets.length > 0 && !selectedOutletId) {
        setSelectedOutletId(outlets[0].id);
    }

    const { data: products, isLoading } = trpc.products.list.useQuery(
        { outletId: selectedOutletId },
        { enabled: !!selectedOutletId }
    );

    const { data: categories } = trpc.categories.list.useQuery(
        { outletId: selectedOutletId },
        { enabled: !!selectedOutletId }
    );

    const { data: suppliers } = trpc.suppliers.list.useQuery();

    const createCategoryMutation = trpc.categories.create.useMutation({
        onSuccess: () => {
            toast.success("Category created");
            utils.categories.list.invalidate();
        }
    });

    const createMutation = trpc.products.create.useMutation({
        onSuccess: () => {
            toast.success("Product created successfully");
            setIsCreateOpen(false);
            utils.products.list.invalidate();
        },
        onError: (err) => toast.error(err.message),
    });

    const updateMutation = trpc.products.update.useMutation({
        onSuccess: () => {
            toast.success("Product updated successfully");
            setEditingProduct(null);
            utils.products.list.invalidate();
        },
        onError: (err) => toast.error(err.message),
    });

    const deleteMutation = trpc.products.delete.useMutation({
        onSuccess: () => {
            toast.success("Product deleted successfully");
            utils.products.list.invalidate();
        },
        onError: (err) => toast.error(err.message),
    });

    const adjustStockMutation = trpc.products.adjustStock.useMutation({
        onSuccess: () => {
            toast.success("Stock adjusted successfully");
            setIsAdjustOpen(false);
            setAdjustingProduct(null);
            utils.products.list.invalidate();
        },
        onError: (err) => toast.error(err.message),
    });

    const handleCreateCategory = () => {
        const name = prompt("Enter category name:");
        if (name) {
            createCategoryMutation.mutate({ outletId: selectedOutletId, name });
        }
    };

    const filteredProducts = products?.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
    );

    const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            outletId: selectedOutletId,
            name: formData.get("name") as string,
            sku: formData.get("sku") as string,
            unit: formData.get("unit") as string,
            minStock: Number(formData.get("minStock")),
            supplierId: formData.get("supplierId") as string || undefined,
            price: Number(formData.get("price")),
            categoryId: formData.get("categoryId") as string || undefined,
            imageUrl: formData.get("imageUrl") as string || undefined,
            description: formData.get("description") as string || undefined,
        };

        if (editingProduct) {
            updateMutation.mutate({ id: editingProduct.id, ...data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleAdjustSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const qty = Number(formData.get("qty"));
        const type = formData.get("type") as any;
        const action = formData.get("action") as string;
        const finalQty = action === "remove" ? -qty : qty;

        adjustStockMutation.mutate({
            productId: adjustingProduct.id,
            outletId: selectedOutletId,
            qty: finalQty,
            type: type,
            notes: formData.get("notes") as string,
        });
    };

    return (
        <PageTransition>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Inventory</h1>
                        <p className="text-muted-foreground">Manage products, stock levels, and adjustments.</p>
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
                            <Plus className="mr-2 h-4 w-4" /> Add Product
                        </Button>
                    </div>
                </div>

                <Card className="border-none shadow-sm bg-white/60 backdrop-blur-xl ring-1 ring-gray-200/50">
                    <CardContent className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search products by name or SKU..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 bg-white/50 border-gray-200 focus:bg-white transition-all"
                            />
                        </div>
                    </CardContent>
                </Card>

                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-lg" />
                        ))}
                    </div>
                ) : (
                    <StaggerContainer className="space-y-3" staggerDelay={0.05}>
                        {filteredProducts?.map((product) => (
                            <StaggerItem key={product.id}>
                                <div className="group flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-full ${product.currentStock <= product.minStock ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                            <Package className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-gray-900">{product.name}</h3>
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <Badge variant="outline" className="text-xs font-normal">SKU: {product.sku}</Badge>
                                                <span>•</span>
                                                <span className="font-semibold text-gray-900">${Number(product.price).toFixed(2)}</span>
                                                <span>•</span>
                                                <span>{product.unit}</span>
                                                {product.category && (
                                                    <>
                                                        <span>•</span>
                                                        <Badge variant="secondary" className="text-xs">{product.category.name}</Badge>
                                                    </>
                                                )}
                                                {product.supplier && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-blue-600">{product.supplier.name}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className={`text-lg font-bold ${product.currentStock <= product.minStock ? 'text-red-600' : 'text-gray-900'}`}>
                                                {product.currentStock}
                                            </div>
                                            <div className="text-xs text-gray-500">Stock Level</div>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="outline" size="sm" onClick={() => { setAdjustingProduct(product); setIsAdjustOpen(true); }}>
                                                <ArrowRightLeft className="h-4 w-4 mr-1" /> Adjust
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => { setEditingProduct(product); setIsCreateOpen(true); }}>
                                                <Pencil className="h-4 w-4 text-gray-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => {
                                                if (confirm("Delete product?")) deleteMutation.mutate(product.id);
                                            }}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </StaggerItem>
                        ))}
                        {filteredProducts?.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                No products found.
                            </div>
                        )}
                    </StaggerContainer>
                )}

                <Dialog open={isCreateOpen} onOpenChange={(open) => {
                    if (!open) {
                        setIsCreateOpen(false);
                        setEditingProduct(null);
                    }
                }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input name="name" defaultValue={editingProduct?.name} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>SKU</Label>
                                    <Input name="sku" defaultValue={editingProduct?.sku} required />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Price</Label>
                                    <Input name="price" type="number" step="0.01" defaultValue={editingProduct?.price || 0} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <div className="flex gap-2">
                                        <Select name="categoryId" defaultValue={editingProduct?.categoryId || ""}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select Category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories?.map((c) => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button type="button" variant="outline" size="icon" onClick={handleCreateCategory}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Unit</Label>
                                    <Input name="unit" defaultValue={editingProduct?.unit} placeholder="kg, pcs" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Min Stock Alert</Label>
                                    <Input name="minStock" type="number" defaultValue={editingProduct?.minStock || 0} required />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Image URL</Label>
                                <Input name="imageUrl" defaultValue={editingProduct?.imageUrl} placeholder="https://..." />
                            </div>

                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea name="description" defaultValue={editingProduct?.description} />
                            </div>

                            <div className="space-y-2">
                                <Label>Supplier (Optional)</Label>
                                <Select name="supplierId" defaultValue={editingProduct?.supplierId || ""}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Supplier" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {suppliers?.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Product"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={isAdjustOpen} onOpenChange={(open) => {
                    if (!open) {
                        setIsAdjustOpen(false);
                        setAdjustingProduct(null);
                    }
                }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Adjust Stock: {adjustingProduct?.name}</DialogTitle>
                            <DialogDescription>
                                Current Stock: {adjustingProduct?.currentStock} {adjustingProduct?.unit}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAdjustSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Action</Label>
                                    <Select name="action" defaultValue="add">
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="add">Add Stock (+)</SelectItem>
                                            <SelectItem value="remove">Remove Stock (-)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Quantity</Label>
                                    <Input name="qty" type="number" step="0.01" min="0" required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Reason</Label>
                                <Select name="type" defaultValue="PURCHASE">
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PURCHASE">Purchase / Restock</SelectItem>
                                        <SelectItem value="ADJUSTMENT">Correction / Audit</SelectItem>
                                        <SelectItem value="WASTE">Wastage / Spoilage</SelectItem>
                                        <SelectItem value="SALE">Manual Sale</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Textarea name="notes" placeholder="Optional notes..." />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={adjustStockMutation.isPending}>
                                    {adjustStockMutation.isPending ? "Updating..." : "Update Stock"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </PageTransition>
    );
}

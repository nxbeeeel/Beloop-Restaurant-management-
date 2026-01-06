"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { convertBetweenUsageUnits } from "@/lib/units";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Loader2, UtensilsCrossed, MoreHorizontal, Pencil, Trash2, Image as ImageIcon, X, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { SkeletonRow } from "@/components/ui/skeleton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";


interface Product {
    id: string;
    name: string;
    price: number;
    sku: string;
    unit: string;
    supplierId?: string | null;
    categoryId?: string | null;
    category?: { id: string; name: string } | null;
    description?: string | null;
    currentStock: number;
    recipeItems?: { ingredientId: string; quantity: number; unit?: string; ingredient: { name: string; usageUnit?: string; costPerUsageUnit?: number } }[];
}

export default function MenuPage() {
    const [search, setSearch] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Product> & { recipe: { ingredientId: string; quantity: number; unit: string }[] }>({
        name: "", unit: "portion", price: 0, sku: "", description: "", categoryId: null, recipe: []
    });

    // Category Form State
    const [newCategoryName, setNewCategoryName] = useState("");

    const { data: user } = trpc.dashboard.getUser.useQuery();
    const outletId = user?.outletId || "";

    const utils = trpc.useUtils();
    const { data: products, isLoading } = trpc.products.list.useQuery(
        { outletId },
        { enabled: !!outletId }
    );

    const { data: categories } = trpc.categories.list.useQuery(
        { outletId },
        { enabled: !!outletId }
    );

    const { data: ingredients } = trpc.ingredients.list.useQuery(
        { outletId },
        { enabled: !!outletId && isAddOpen }
    );

    const { data: suppliers } = trpc.suppliers.list.useQuery();

    // Mutations
    // Mutations
    const createMutation = trpc.products.create.useMutation({
        onMutate: async (newProduct) => {
            await utils.products.list.cancel();
            const previousProducts = utils.products.list.getData({ outletId });

            utils.products.list.setData({ outletId }, (old) => {
                if (!old) return [];
                return [
                    {
                        id: `temp-${Date.now()}`,
                        ...newProduct,
                        price: newProduct.price || 0,
                        currentStock: 0,
                        categoryId: newProduct.categoryId || null,
                        category: categories?.find(c => c.id === newProduct.categoryId) || null,
                        supplier: null,
                        recipeItems: [],
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    } as any,
                    ...old
                ];
            });

            return { previousProducts };
        },
        onSuccess: () => {
            setIsAddOpen(false);
            resetForm();
            toast.success("Item added to menu");
        },
        onError: (err, _newProduct, context) => {
            if (context?.previousProducts) {
                utils.products.list.setData({ outletId }, context.previousProducts);
            }
            toast.error(err.message);
        },
        onSettled: () => {
            utils.products.list.invalidate();
        }
    });

    const updateMutation = trpc.products.update.useMutation({
        onMutate: async (updatedProduct) => {
            await utils.products.list.cancel();
            const previousProducts = utils.products.list.getData({ outletId });

            utils.products.list.setData({ outletId }, (old) => {
                if (!old) return old;
                return old.map(p => {
                    if (p.id === updatedProduct.id) {
                        return {
                            ...p,
                            ...updatedProduct,
                            category: categories?.find(c => c.id === updatedProduct.categoryId) || p.category,
                            updatedAt: new Date()
                        } as typeof p;
                    }
                    return p;
                });
            });

            return { previousProducts };
        },
        onSuccess: () => {
            setEditingProduct(null);
            resetForm();
            toast.success("Menu item updated");
        },
        onError: (err, _updatedProduct, context) => {
            if (context?.previousProducts) {
                utils.products.list.setData({ outletId }, context.previousProducts);
            }
            toast.error(err.message);
        },
        onSettled: () => {
            utils.products.list.invalidate();
        }
    });

    const createCategoryMutation = trpc.categories.create.useMutation({
        onMutate: async (newCategory) => {
            await utils.categories.list.cancel();
            const previousCategories = utils.categories.list.getData({ outletId });

            utils.categories.list.setData({ outletId }, (old) => {
                if (!old) return [];
                return [
                    {
                        id: `temp-${Date.now()}`,
                        name: newCategory.name,
                        outletId,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    ...old
                ];
            });

            return { previousCategories };
        },
        onSuccess: () => {
            setNewCategoryName("");
            toast.success("Category created");
        },
        onError: (err, _newCategory, context) => {
            if (context?.previousCategories) {
                utils.categories.list.setData({ outletId }, context.previousCategories);
            }
            toast.error(err.message);
        },
        onSettled: () => {
            utils.categories.list.invalidate();
        }
    });

    const deleteCategoryMutation = trpc.categories.delete.useMutation({
        onMutate: async (categoryId) => {
            await utils.categories.list.cancel();
            const previousCategories = utils.categories.list.getData({ outletId });

            utils.categories.list.setData({ outletId }, (old) => {
                if (!old) return old;
                return old.filter(c => c.id !== categoryId);
            });

            return { previousCategories };
        },
        onSuccess: () => {
            toast.success("Category deleted");
        },
        onError: (err, _categoryId, context) => {
            if (context?.previousCategories) {
                utils.categories.list.setData({ outletId }, context.previousCategories);
            }
            toast.error(err.message);
        },
        onSettled: () => {
            utils.categories.list.invalidate();
        }
    });

    const resetForm = () => {
        setFormData({ name: "", unit: "portion", price: 0, sku: "", description: "", categoryId: null, recipe: [] });
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
                supplierId: formData.supplierId || null,
                categoryId: formData.categoryId || null,
                description: formData.description || undefined,
                recipe: formData.recipe
            });
        } else {
            createMutation.mutate({
                outletId,
                name: formData.name,
                sku: formData.sku,
                unit: formData.unit || "portion",
                minStock: 0,
                supplierId: formData.supplierId || undefined,
                categoryId: formData.categoryId || undefined,
                price: formData.price || 0,
                description: formData.description || undefined,
                applyToAllOutlets: false,
                recipe: formData.recipe
            });
        }
    };

    const handleCreateCategory = () => {
        if (!newCategoryName.trim()) return;
        createCategoryMutation.mutate({
            outletId,
            name: newCategoryName
        });
    };

    const openEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            sku: product.sku,
            price: product.price,
            unit: product.unit,
            supplierId: product.supplierId,
            categoryId: product.categoryId,
            description: product.description,
            recipe: product.recipeItems?.map(r => ({
                ingredientId: r.ingredientId,
                quantity: r.quantity,
                unit: r.unit || r.ingredient?.usageUnit || 'g' // Use saved unit, fallback to ingredient default
            })) || []
        });
        setIsAddOpen(true);
    };

    // Recipe Logic
    const addIngredientToRecipe = (ingredientId: string) => {
        if (formData.recipe.some(r => r.ingredientId === ingredientId)) return;
        const ingredient = ingredients?.find(i => i.id === ingredientId);
        setFormData({
            ...formData,
            recipe: [...formData.recipe, { ingredientId, quantity: 1, unit: ingredient?.usageUnit || 'g' }]
        });
    };

    const removeIngredientFromRecipe = (ingredientId: string) => {
        setFormData({
            ...formData,
            recipe: formData.recipe.filter(r => r.ingredientId !== ingredientId)
        });
    };

    const updateIngredientQuantity = (ingredientId: string, qty: number) => {
        setFormData({
            ...formData,
            recipe: formData.recipe.map(r => r.ingredientId === ingredientId ? { ...r, quantity: qty } : r)
        });
    };

    const handleIngredientUnitChange = (ingredientId: string, unit: string) => {
        setFormData({
            ...formData,
            recipe: formData.recipe.map(r => r.ingredientId === ingredientId ? { ...r, unit } : r)
        });
    };



    const baseCost = formData.recipe.reduce((acc, item) => {
        const ingredient = ingredients?.find(i => i.id === item.ingredientId);
        if (!ingredient) return acc;

        try {
            // Safe check for missing pricing data
            const cost = Number(ingredient.costPerUsageUnit || 0);

            // Convert recipe item quantity to ingredient's usage unit
            // e.g. Recipe: 500g, Ingredient Usage: kg -> Convert 500g to 0.5kg
            const convertedQty = convertBetweenUsageUnits(
                item.quantity,
                item.unit,
                ingredient.usageUnit
            );
            return acc + (cost * convertedQty);
        } catch (error) {
            console.error(`Unit conversion error for ${ingredient.name}:`, error);
            // Fallback: if conversion fails (e.g. kg to L), ignore cost or assume 1:1?
            // For safety, we'll ignore cost to avoid wrong calculations, but maybe alert user?
            return acc;
        }
    }, 0);

    const grossMargin = (formData.price || 0) > 0 ? (((formData.price || 0) - baseCost) / (formData.price || 0)) * 100 : 0;

    const filteredProducts = products?.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Menu Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your products, recipes, and pricing</p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <Settings2 className="w-4 h-4" /> Categories
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Manage Categories</DialogTitle>
                                <DialogDescription>Create and manage menu categories.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="New Category Name"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                    />
                                    <Button onClick={handleCreateCategory} disabled={createCategoryMutation.isPending}>
                                        {createCategoryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    </Button>
                                </div>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {categories?.map(category => (
                                        <div key={category.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border">
                                            <span className="font-medium">{category.name}</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => deleteCategoryMutation.mutate(category.id)}
                                                disabled={deleteCategoryMutation.isPending}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {categories?.length === 0 && (
                                        <div className="text-center text-gray-500 text-sm py-4">No categories found</div>
                                    )}
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isAddOpen} onOpenChange={(open) => {
                        setIsAddOpen(open);
                        if (!open) {
                            setEditingProduct(null);
                            resetForm();
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button
                                onClick={() => {
                                    setEditingProduct(null);
                                    resetForm();
                                    setIsAddOpen(true);
                                }}
                                className="bg-primary hover:bg-primary/90 shadow-sm transition-all duration-200"
                            >
                                <Plus className="w-4 h-4 mr-2" /> Add Item
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>{editingProduct ? "Edit Menu Item" : "Add New Menu Item"}</DialogTitle>
                                <DialogDescription>
                                    {editingProduct ? "Update the details of your menu item below." : "Fill in the details to create a new menu item."}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                                {/* Left Column: Product Details */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-900">Product Details</h3>
                                    <div className="space-y-2">
                                        <Label>Item Name</Label>
                                        <Input
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g. Chicken Burger"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>SKU / Code</Label>
                                        <Input
                                            value={formData.sku}
                                            onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                            placeholder="e.g. BURG-001"
                                            disabled={!!editingProduct}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Category</Label>
                                        <Select
                                            value={formData.categoryId || "uncategorized"}
                                            onValueChange={(val) => setFormData({ ...formData, categoryId: val === "uncategorized" ? null : val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="uncategorized">Uncategorized</SelectItem>
                                                {categories?.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Input
                                            value={formData.description || ""}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Brief description..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Price (₹)</Label>
                                            <Input
                                                type="number"
                                                value={formData.price}
                                                onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Unit</Label>
                                            <Input
                                                value={formData.unit}
                                                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                                placeholder="e.g. portion"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Recipe & Costing */}
                                <div className="space-y-4 border-l pl-6">
                                    <h3 className="font-semibold text-gray-900">Recipe & Costing</h3>

                                    <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Base Cost:</span>
                                            <span className="font-medium">₹{baseCost.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Selling Price:</span>
                                            <span className="font-medium">₹{formData.price?.toFixed(2)}</span>
                                        </div>
                                        <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                                            <span className="font-semibold text-gray-700">Gross Margin:</span>
                                            <Badge variant={grossMargin > 50 ? "default" : grossMargin > 20 ? "secondary" : "destructive"}>
                                                {grossMargin.toFixed(1)}%
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Add Ingredient</Label>
                                        <Select onValueChange={addIngredientToRecipe} disabled={!ingredients?.length}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={ingredients?.length ? "Select ingredient..." : "Loading ingredients..."} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ingredients?.map(ing => (
                                                    <SelectItem key={ing.id} value={ing.id}>
                                                        {ing.name} ({ing.usageUnit}) - ₹{Number(ing.costPerUsageUnit).toFixed(2)}
                                                    </SelectItem>
                                                ))}
                                                {!ingredients?.length && (
                                                    <div className="p-2 text-sm text-gray-500 text-center">No ingredients found</div>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                        {formData.recipe.map((item, idx) => {
                                            const ing = ingredients?.find(i => i.id === item.ingredientId);
                                            return (
                                                <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded border">
                                                    <div className="flex-1 text-sm">
                                                        <div className="font-medium">{ing?.name || 'Loading...'}</div>
                                                        <div className="text-xs text-gray-500">₹{Number(ing?.costPerUsageUnit || 0).toFixed(2)} / {ing?.usageUnit || '-'}</div>
                                                    </div>
                                                    <div className="w-20">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            className="h-8 text-right"
                                                            value={item.quantity}
                                                            onChange={e => updateIngredientQuantity(item.ingredientId, parseFloat(e.target.value))}
                                                        />
                                                    </div>
                                                    <div className="w-16">
                                                        <Select value={item.unit} onValueChange={(val) => handleIngredientUnitChange(item.ingredientId, val)}>
                                                            <SelectTrigger className="h-8">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="g">g</SelectItem>
                                                                <SelectItem value="kg">kg</SelectItem>
                                                                <SelectItem value="ml">ml</SelectItem>
                                                                <SelectItem value="L">L</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => removeIngredientFromRecipe(item.ingredientId)}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                        {formData.recipe.length === 0 && (
                                            <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed rounded-lg">
                                                No ingredients added
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t">
                                <Button
                                    onClick={handleSave}
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    className="bg-primary hover:bg-primary/90 min-w-[150px]"
                                >
                                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                    {editingProduct ? "Update Item" : "Create Item"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Filters & Table */}
            <Card className="border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search menu items..."
                            className="pl-9 bg-white border-gray-200 focus:border-primary focus:ring-primary"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100 uppercase tracking-wider text-xs">
                            <tr>
                                <th className="p-4 w-16">Image</th>
                                <th className="p-4">Item Details</th>
                                <th className="p-4">Category</th>
                                <th className="p-4">Price</th>
                                <th className="p-4">Recipe</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <SkeletonRow key={i} columns={6} />
                                ))
                            ) : filteredProducts?.map((product: any) => (
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
                                    <td className="p-4">
                                        {product.recipeItems && product.recipeItems.length > 0 ? (
                                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">
                                                {product.recipeItems.length} Ingredients
                                            </Badge>
                                        ) : (
                                            <span className="text-gray-400 text-xs">-</span>
                                        )}
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
                                    <td colSpan={6} className="p-12 text-center text-gray-500">
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

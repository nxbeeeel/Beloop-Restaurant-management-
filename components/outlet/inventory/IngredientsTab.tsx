"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Package, AlertTriangle, Search, Plus, Edit, Loader2, IndianRupee } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { IngredientModal } from "./IngredientModal";

interface IngredientsTabProps {
    outletId: string;
}

export function IngredientsTab({ outletId }: IngredientsTabProps) {
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedIngredient, setSelectedIngredient] = useState<any>(null);

    const { data: ingredients, isLoading } = trpc.ingredients.list.useQuery(
        { outletId, search },
        { enabled: !!outletId }
    );

    const handleEdit = (ingredient: any) => {
        setSelectedIngredient(ingredient);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setSelectedIngredient(null);
        setIsModalOpen(true);
    };

    // Stats
    const totalItems = ingredients?.length || 0;
    const lowStockItems = ingredients?.filter(i => i.stock <= i.minStock && i.stock > 0).length || 0;
    const outOfStockItems = ingredients?.filter(i => i.stock === 0).length || 0;
    const totalValue = ingredients?.reduce((sum, i) => sum + (i.stock * Number(i.cost)), 0) || 0;

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-none shadow-sm bg-white ring-1 ring-gray-100">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Ingredients</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{totalItems}</p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-xl">
                            <Package className="w-5 h-5 text-purple-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white ring-1 ring-gray-100">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Low Stock</p>
                            <p className="text-2xl font-bold text-yellow-600 mt-1">{lowStockItems}</p>
                        </div>
                        <div className="p-3 bg-yellow-50 rounded-xl">
                            <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white ring-1 ring-gray-100">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Out of Stock</p>
                            <p className="text-2xl font-bold text-red-600 mt-1">{outOfStockItems}</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-xl">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white ring-1 ring-gray-100">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Stock Value</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">₹{totalValue.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-xl">
                            <IndianRupee className="w-5 h-5 text-green-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Actions & Table */}
            <Card className="border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search ingredients..."
                            className="pl-9 bg-white border-gray-200 focus:border-primary focus:ring-primary"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-white">
                        <Plus className="w-4 h-4 mr-2" /> Add Ingredient
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100 uppercase tracking-wider text-xs">
                            <tr>
                                <th className="p-4">Ingredient</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Current Stock</th>
                                <th className="p-4">Cost / Unit</th>
                                <th className="p-4">Total Value</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                                    </td>
                                </tr>
                            ) : ingredients?.map(ingredient => (
                                <tr key={ingredient.id} className="hover:bg-gray-50/80 transition-colors">
                                    <td className="p-4 font-bold text-gray-900">{ingredient.name}</td>
                                    <td className="p-4">
                                        {ingredient.stock === 0 ? (
                                            <Badge variant="destructive" className="bg-red-50 text-red-700 hover:bg-red-100 border-red-100">Out of Stock</Badge>
                                        ) : ingredient.stock <= ingredient.minStock ? (
                                            <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-100">Low Stock</Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">In Stock</Badge>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-gray-900 text-lg">
                                            {ingredient.stock} <span className="text-gray-400 text-xs font-normal">{ingredient.unit}</span>
                                        </div>
                                        <div className="text-xs text-gray-400">Min: {ingredient.minStock}</div>
                                    </td>
                                    <td className="p-4 text-gray-600">₹{Number(ingredient.cost).toFixed(2)}</td>
                                    <td className="p-4 text-gray-600 font-medium">
                                        ₹{(ingredient.stock * Number(ingredient.cost)).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(ingredient)}
                                            className="hover:bg-gray-100 text-gray-500"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {ingredients?.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-gray-500">
                                        <Package className="w-12 h-12 mx-auto text-gray-200 mb-3" />
                                        <p className="font-medium">No ingredients found</p>
                                        <p className="text-xs mt-1">Add raw materials to start tracking costs.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <IngredientModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                ingredient={selectedIngredient}
                outletId={outletId}
            />
        </div>
    );
}

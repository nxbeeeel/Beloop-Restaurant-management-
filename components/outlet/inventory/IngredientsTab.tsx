"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, AlertTriangle, IndianRupee, Plus } from "lucide-react";
import { IngredientModal } from "./IngredientModal";
import { IngredientDataTable } from "./IngredientDataTable";

interface IngredientsTabProps {
    outletId: string;
}

export function IngredientsTab({ outletId }: IngredientsTabProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedIngredient, setSelectedIngredient] = useState<any>(null);

    // Using query passed down to DataTable or duplicated?
    // DataTable handles its own query in my implementation above. 
    // Here we need data for STATS.
    // Ideally we should move stats calculation to server side or hook that returns both.
    // For now, we will duplicate the hook call (React Query dedupes requests so it's fine).
    const { data: ingredients, isLoading } = trpc.ingredients.list.useQuery(
        { outletId, search: "" },
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
    const lowStockItems = ingredients?.filter((i: any) => i.stock <= i.minStock && i.stock > 0).length || 0;
    const outOfStockItems = ingredients?.filter((i: any) => i.stock === 0).length || 0;
    const totalValue = ingredients?.reduce((sum: number, i: any) => sum + (i.stock * Number(i.costPerPurchaseUnit)), 0) || 0;

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-none shadow-sm bg-white ring-1 ring-gray-100">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Ingredients</p>
                            {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className="text-2xl font-bold text-gray-900 mt-1">{totalItems}</p>}
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
                            {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className="text-2xl font-bold text-yellow-600 mt-1">{lowStockItems}</p>}
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
                            {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className="text-2xl font-bold text-red-600 mt-1">{outOfStockItems}</p>}
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
                            {isLoading ? <Skeleton className="h-8 w-32 mt-1" /> : <p className="text-2xl font-bold text-gray-900 mt-1">₹{totalValue.toLocaleString()}</p>}
                        </div>
                        <div className="p-3 bg-green-50 rounded-xl">
                            <IndianRupee className="w-5 h-5 text-green-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Actions & Table */}
            <Card className="border-gray-200 shadow-sm overflow-hidden bg-white">
                <div className="p-4 border-b border-gray-100 flex justify-end bg-gray-50/50">
                    <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-white">
                        <Plus className="w-4 h-4 mr-2" /> Add Ingredient
                    </Button>
                </div>

                <IngredientDataTable outletId={outletId} onEdit={handleEdit} />
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


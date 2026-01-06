"use client";

import { trpc } from "@/lib/trpc";
import { ArrowUpRight, ArrowDownRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { StockMovementModal } from "@/components/outlet/inventory/StockMovementModal";
import { UnifiedStockTable } from "@/components/outlet/inventory/UnifiedStockTable";
import { IngredientModal } from "@/components/outlet/inventory/IngredientModal";

export default function InventoryPage() {
    const { data: user, isLoading } = trpc.dashboard.getUser.useQuery();
    const outletId = user?.outletId || "";

    const [stockModalConfig, setStockModalConfig] = useState<{ isOpen: boolean; type: 'IN' | 'OUT' }>({
        isOpen: false,
        type: 'IN'
    });

    const [ingredientModalOpen, setIngredientModalOpen] = useState(false);

    // Loading state - must be after all hooks
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    // No outlet assigned - must be after all hooks
    if (!outletId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <p className="text-gray-500 text-lg">No outlet assigned to your account.</p>
                <p className="text-gray-400 text-sm mt-2">Please contact your administrator.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24 lg:pb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">Inventory Management</h1>
                    <p className="text-gray-500 text-sm lg:text-base">Track stock levels for products and ingredients.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button
                        className="bg-primary hover:bg-primary/90 text-white"
                        onClick={() => setIngredientModalOpen(true)}
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add Ingredient
                    </Button>
                    <Button
                        variant="outline"
                        className="text-gray-600 hover:text-green-600 hover:bg-green-50 border-gray-200"
                        onClick={() => setStockModalConfig({ isOpen: true, type: 'IN' })}
                    >
                        <ArrowDownRight className="w-4 h-4 mr-2" /> Stock In
                    </Button>
                    <Button
                        variant="outline"
                        className="text-gray-600 hover:text-red-600 hover:bg-red-50 border-gray-200"
                        onClick={() => setStockModalConfig({ isOpen: true, type: 'OUT' })}
                    >
                        <ArrowUpRight className="w-4 h-4 mr-2" /> Stock Out
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-1">
                <UnifiedStockTable outletId={outletId} />
            </div>

            {/* Stock Movement Modal */}
            <StockMovementModal
                isOpen={stockModalConfig.isOpen}
                onClose={() => setStockModalConfig(prev => ({ ...prev, isOpen: false }))}
                outletId={outletId}
                type={stockModalConfig.type}
            />

            {/* Add Ingredient Modal */}
            <IngredientModal
                isOpen={ingredientModalOpen}
                onClose={() => setIngredientModalOpen(false)}
                outletId={outletId}
            />
        </div>
    );
}

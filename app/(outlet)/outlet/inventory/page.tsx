"use client";

import { trpc } from "@/lib/trpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductsTab } from "@/components/outlet/inventory/ProductsTab";
import { IngredientsTab } from "@/components/outlet/inventory/IngredientsTab";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import Link from "next/link";
import { StockMovementModal } from "@/components/outlet/inventory/StockMovementModal";

export default function InventoryPage() {
    const { data: user } = trpc.dashboard.getUser.useQuery();
    const outletId = user?.outletId || "";

    const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; type: 'IN' | 'OUT' }>({
        isOpen: false,
        type: 'IN'
    });

    if (!outletId) return null;

    return (
        <div className="space-y-6 pb-24 lg:pb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">Inventory Management</h1>
                    <p className="text-gray-500 text-sm lg:text-base">Track stock levels for products and raw ingredients.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="text-gray-600 hover:text-green-600 hover:bg-green-50 border-gray-200"
                        onClick={() => setModalConfig({ isOpen: true, type: 'IN' })}
                    >
                        <ArrowDownRight className="w-4 h-4 mr-2" /> Stock In
                    </Button>
                    <Button
                        variant="outline"
                        className="text-gray-600 hover:text-red-600 hover:bg-red-50 border-gray-200"
                        onClick={() => setModalConfig({ isOpen: true, type: 'OUT' })}
                    >
                        <ArrowUpRight className="w-4 h-4 mr-2" /> Stock Out
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="products" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="products">Products (Direct)</TabsTrigger>
                    <TabsTrigger value="ingredients">Ingredients (Recipe)</TabsTrigger>
                </TabsList>
                <TabsContent value="products" className="mt-6">
                    <ProductsTab outletId={outletId} />
                </TabsContent>
                <TabsContent value="ingredients" className="mt-6">
                    <IngredientsTab outletId={outletId} />
                </TabsContent>
            </Tabs>

            <StockMovementModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                outletId={outletId}
                type={modalConfig.type}
            />
        </div>
    );
}

"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, AlertTriangle, IndianRupee } from "lucide-react";
import { ProductDataTable } from "./ProductDataTable";

interface ProductsTabProps {
    outletId: string;
}

export function ProductsTab({ outletId }: ProductsTabProps) {
    const { data: products, isLoading } = trpc.products.list.useQuery(
        { outletId },
        { enabled: !!outletId }
    );

    // Stats Calculation
    const totalItems = products?.length || 0;
    const lowStockItems = products?.filter((p: any) => p.currentStock <= p.minStock && p.currentStock > 0).length || 0;
    const outOfStockItems = products?.filter((p: any) => p.currentStock === 0 && (p._count?.recipeItems || 0) === 0).length || 0;
    const totalValue = products?.reduce((sum: number, p: any) => sum + (p.currentStock * Number(p.price)), 0) || 0;

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-none shadow-sm bg-white ring-1 ring-gray-100">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Products</p>
                            {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className="text-2xl font-bold text-gray-900 mt-1">{totalItems}</p>}
                        </div>
                        <div className="p-3 bg-blue-50 rounded-xl">
                            <Package className="w-5 h-5 text-blue-600" />
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

            {/* Data Table */}
            <Card className="border-gray-200 shadow-sm overflow-hidden bg-white">
                <ProductDataTable outletId={outletId} />
            </Card>
        </div>
    );
}


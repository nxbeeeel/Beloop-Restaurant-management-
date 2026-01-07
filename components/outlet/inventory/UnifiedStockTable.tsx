"use client";

import { useMemo, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { DataTable } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Minus, ArrowUpDown, Package, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

interface UnifiedStockTableProps {
    outletId: string;
}

type StockItem = {
    id: string;
    type: 'PRODUCT' | 'INGREDIENT';
    name: string;
    sku: string;
    stock: number;
    minStock: number;
    unit: string;
    price: number;
    value: number;
};

export function UnifiedStockTable({ outletId }: UnifiedStockTableProps) {
    const utils = trpc.useUtils();
    const { data: stockItems, isLoading } = trpc.inventory.getUnifiedStock.useQuery({ outletId });

    const adjustMutation = trpc.inventory.adjustStock.useMutation({
        onSuccess: () => {
            utils.inventory.getUnifiedStock.invalidate({ outletId });
            toast.success("Stock updated");
        },
        onError: (err) => toast.error(err.message)
    });

    const isPending = adjustMutation.isPending;

    const handleAdjust = useCallback((item: StockItem, qty: number) => {
        adjustMutation.mutate({
            productId: item.type === 'PRODUCT' ? item.id : undefined,
            ingredientId: item.type === 'INGREDIENT' ? item.id : undefined,
            outletId,
            qty,
            type: 'ADJUSTMENT',
            notes: 'Quick adjustment from inventory list'
        });
    }, [adjustMutation.mutate, outletId]);

    const columns: ColumnDef<StockItem>[] = useMemo(() => [
        {
            accessorKey: "name",
            header: ({ column }) => {
                return (
                    <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                        Item Details
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <div>
                        <div className="font-bold text-gray-900 flex items-center gap-2">
                            {item.name}
                            {item.type === 'PRODUCT' ? (
                                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-blue-50 text-blue-700 border-blue-100">
                                    Product
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-amber-50 text-amber-700 border-amber-100">
                                    Ingredient
                                </Badge>
                            )}
                        </div>
                        {item.sku && <div className="text-xs text-gray-500 font-mono mt-0.5">{item.sku}</div>}
                    </div>
                );
            }
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const item = row.original;

                if (item.stock === 0) {
                    return <Badge variant="destructive" className="bg-red-50 text-red-700 hover:bg-red-100 border-red-100">Out of Stock</Badge>;
                }
                if (item.stock <= item.minStock) {
                    return <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-100">Low Stock</Badge>;
                }
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">In Stock</Badge>;
            }
        },
        {
            accessorKey: "stock",
            header: "Current Stock",
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <div>
                        <div className="font-bold text-gray-900 text-lg">
                            {item.stock} <span className="text-gray-400 text-xs font-normal">{item.unit}</span>
                        </div>
                        <div className="text-xs text-gray-400">Min: {item.minStock}</div>
                    </div>
                );
            }
        },
        {
            id: "value",
            header: "Est. Value",
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <div className="flex flex-col">
                        <span className="text-gray-900 font-medium">₹{item.value.toLocaleString()}</span>
                        <span className="text-xs text-gray-400">₹{item.price} / {item.unit}</span>
                    </div>
                );
            }
        },
        {
            id: "actions",
            header: () => <div className="text-right">Quick Adjust</div>,
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <div className="flex justify-end gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleAdjust(item, -1)}
                            disabled={isPending}
                            title="Reduce stock"
                        >
                            <Minus className="w-3 h-3" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-green-600 border-green-100 hover:bg-green-50 hover:text-green-700"
                            onClick={() => handleAdjust(item, 1)}
                            disabled={isPending}
                            title="Increase stock"
                        >
                            <Plus className="w-3 h-3" />
                        </Button>
                    </div>
                );
            }
        }
    ], [handleAdjust, isPending]);

    if (isLoading) {
        return <TableSkeleton rows={10} />;
    }

    return (
        <DataTable
            columns={columns}
            data={stockItems || []}
            searchKey="name"
            searchPlaceholder="Search products or ingredients..."
        />
    );
}

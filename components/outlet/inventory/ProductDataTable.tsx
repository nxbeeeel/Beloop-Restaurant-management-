"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { DataTable } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Minus, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";

interface ProductDataTableProps {
    outletId: string;
}

type Product = {
    id: string;
    name: string;
    sku: string;
    price: number | any; // prisma decimal handling
    currentStock: number;
    minStock: number;
    unit: string;
    imageUrl?: string | null;
    _count?: { recipeItems: number };
};

export function ProductDataTable({ outletId }: ProductDataTableProps) {
    const utils = trpc.useUtils();
    // Using filtered query from server or client side filtering?
    // The previous implementation fetched ALL and filtered client side.
    // For performance, we should ideally filter server side, but `DataTable` handles client side searching well.
    // Let's stick to listAll for now as per optimized select router.

    // NOTE: passing undefined for search to get all, DataTable handles local search
    const { data: products, isLoading } = trpc.products.list.useQuery({ outletId });

    const adjustMutation = trpc.inventory.adjustStock.useMutation({
        onSuccess: () => {
            utils.products.list.invalidate({ outletId });
            toast.success("Stock updated");
        },
        onError: (err) => toast.error(err.message)
    });

    if (isLoading) {
        return <TableSkeleton colCount={5} rowCount={10} />;
    }

    const handleAdjust = (productId: string, qty: number) => {
        adjustMutation.mutate({
            productId,
            outletId,
            qty,
            type: 'ADJUSTMENT',
            notes: 'Quick adjustment from inventory list'
        });
    };

    const columns: ColumnDef<Product>[] = useMemo(() => [
        {
            accessorKey: "name",
            header: ({ column }) => {
                return (
                    <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                        Product
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const p = row.original;
                return (
                    <div>
                        <div className="font-bold text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">{p.sku}</div>
                    </div>
                );
            }
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const p = row.original;
                const isRecipeItem = (p._count?.recipeItems || 0) > 0;

                if (isRecipeItem) {
                    return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">Made to Order</Badge>;
                }

                if (p.currentStock === 0) {
                    return <Badge variant="destructive" className="bg-red-50 text-red-700 hover:bg-red-100 border-red-100">Out of Stock</Badge>;
                }
                if (p.currentStock <= p.minStock) {
                    return <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-100">Low Stock</Badge>;
                }
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">In Stock</Badge>;
            }
        },
        {
            accessorKey: "currentStock",
            header: "Stock",
            cell: ({ row }) => {
                const p = row.original;
                return (
                    <div>
                        <div className="font-bold text-gray-900 text-lg">
                            {p.currentStock} <span className="text-gray-400 text-xs font-normal">{p.unit}</span>
                        </div>
                        <div className="text-xs text-gray-400">Min: {p.minStock}</div>
                    </div>
                );
            }
        },
        {
            id: "value",
            header: "Value",
            cell: ({ row }) => {
                const p = row.original;
                return (
                    <span className="text-gray-600 font-medium">
                        ₹{(p.currentStock * Number(p.price)).toLocaleString()}
                    </span>
                );
            }
        },
        {
            id: "actions",
            header: () => <div className="text-right">Quick Adjust</div>,
            cell: ({ row }) => {
                const p = row.original;
                return (
                    <div className="flex justify-end gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleAdjust(p.id, -1)}
                            disabled={adjustMutation.isPending}
                        >
                            <Minus className="w-3 h-3" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-green-600 border-green-100 hover:bg-green-50 hover:text-green-700"
                            onClick={() => handleAdjust(p.id, 1)}
                            disabled={adjustMutation.isPending}
                        >
                            <Plus className="w-3 h-3" />
                        </Button>
                    </div>
                );
            }
        }
    ], [adjustMutation]);

    return (
        <DataTable
            columns={columns}
            data={(products as any[]) || []}
            searchKey="name"
            searchPlaceholder="Search products..."
        />
    );
}

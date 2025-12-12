"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { DataTable } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Package, ArrowUpDown } from "lucide-react";

interface IngredientDataTableProps {
    outletId: string;
    onEdit: (ingredient: any) => void;
}

type Ingredient = {
    id: string;
    name: string;
    stock: number;
    minStock: number;
    purchaseUnit: string;
    costPerPurchaseUnit: number | any;
};

export function IngredientDataTable({ outletId, onEdit }: IngredientDataTableProps) {
    const { data: ingredients, isLoading } = trpc.ingredients.list.useQuery({ outletId });

    if (isLoading) {
        return <TableSkeleton colCount={6} rowCount={8} />;
    }

    const columns: ColumnDef<Ingredient>[] = useMemo(() => [
        {
            accessorKey: "name",
            header: ({ column }) => {
                return (
                    <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                        Ingredient
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => (
                <div className="font-bold text-gray-900">{row.original.name}</div>
            )
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const i = row.original;
                if (i.stock === 0) {
                    return <Badge variant="destructive" className="bg-red-50 text-red-700 hover:bg-red-100 border-red-100">Out of Stock</Badge>;
                }
                if (i.stock <= i.minStock) {
                    return <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-100">Low Stock</Badge>;
                }
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">In Stock</Badge>;
            }
        },
        {
            accessorKey: "stock",
            header: "Current Stock",
            cell: ({ row }) => {
                const i = row.original;
                return (
                    <div>
                        <div className="font-bold text-gray-900 text-lg">
                            {i.stock} <span className="text-gray-400 text-xs font-normal">{i.purchaseUnit}</span>
                        </div>
                        <div className="text-xs text-gray-400">Min: {i.minStock}</div>
                    </div>
                );
            }
        },
        {
            id: "cost",
            header: "Cost / Unit",
            cell: ({ row }) => (
                <span className="text-gray-600">₹{Number(row.original.costPerPurchaseUnit).toFixed(2)}</span>
            )
        },
        {
            id: "value",
            header: "Total Value",
            cell: ({ row }) => (
                <span className="text-gray-600 font-medium">
                    ₹{(row.original.stock * Number(row.original.costPerPurchaseUnit)).toLocaleString()}
                </span>
            )
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <div className="text-right">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(row.original)}
                        className="hover:bg-gray-100 text-gray-500"
                    >
                        <Edit className="w-4 h-4" />
                    </Button>
                </div>
            )
        }
    ], [onEdit]);

    return (
        <DataTable
            columns={columns}
            data={(ingredients as any[]) || []}
            searchKey="name"
            searchPlaceholder="Search ingredients..."
        />
    );
}

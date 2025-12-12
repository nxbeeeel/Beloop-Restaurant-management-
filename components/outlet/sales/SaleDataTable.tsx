"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";

interface SaleDataTableProps {
    data: any[];
}

type SaleEntry = {
    id: string;
    date: Date | string;
    totalSale: number | any;
    totalExpense?: number | any; // Sometimes explicitly available or calculated
    profit: number | any;
    staff: { name: string };
};

export function SaleDataTable({ data }: SaleDataTableProps) {
    const columns: ColumnDef<SaleEntry>[] = useMemo(() => [
        {
            accessorKey: "date",
            header: ({ column }) => {
                return (
                    <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                        Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => (
                <div className="font-medium text-gray-900">
                    {format(new Date(row.original.date), "MMM d, yyyy")}
                </div>
            )
        },
        {
            accessorKey: "totalSale",
            header: () => <div className="text-right">Total Sale</div>,
            cell: ({ row }) => (
                <div className="text-right font-medium">
                    ₹{Number(row.original.totalSale).toFixed(2)}
                </div>
            )
        },
        {
            id: "expenses",
            header: () => <div className="text-right">Expenses</div>,
            cell: ({ row }) => {
                const sale = row.original;
                // If totalExpense is not on the object, calculate it: Sale - Profit
                const expense = sale.totalExpense
                    ? Number(sale.totalExpense)
                    : Number(sale.totalSale) - Number(sale.profit);

                return (
                    <div className="text-right text-orange-600">
                        ₹{expense.toFixed(2)}
                    </div>
                )
            }
        },
        {
            accessorKey: "profit",
            header: () => <div className="text-right">Net Profit</div>,
            cell: ({ row }) => (
                <div className="text-right font-bold text-green-600">
                    ₹{Number(row.original.profit).toFixed(2)}
                </div>
            )
        },
        {
            id: "staff",
            header: "Submitted By",
            accessorFn: (row) => row.staff.name,
            cell: ({ row }) => (
                <div className="text-gray-500">
                    {row.original.staff.name}
                </div>
            )
        }
    ], []);

    return (
        <DataTable
            columns={columns}
            data={data}
            searchKey="staff" // Search by staff name loosely, or date if formatted string? DataTable simplistic search might be tricky for date.
            // Ideally we search by date string but that requires a custom accessor. 
            // Let's stick to basic filter or disable search if not needed.
            // Actually, Searching by date string is useful.
            searchPlaceholder="Search..."
        />
    );
}

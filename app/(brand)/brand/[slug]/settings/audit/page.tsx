"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type AuditLog = {
    id: string;
    action: string;
    entityType: string;
    details: any;
    timestamp: Date;
    user: {
        name: string | null;
        email: string;
        role: string;
    } | null;
};

export default function AuditLogPage({ params }: { params: { slug: string } }) {
    const { data, isLoading } = trpc.audit.getLogs.useQuery({ limit: 100 });

    const columns: ColumnDef<AuditLog>[] = useMemo(() => [
        {
            accessorKey: "timestamp",
            header: ({ column }) => {
                return (
                    <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                        Date & Time
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <span className="text-stone-600 font-mono text-xs">{format(new Date(row.original.timestamp), "MMM d, yyyy HH:mm:ss")}</span>,
        },
        {
            accessorKey: "user.name",
            header: "User",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-medium text-stone-900">{row.original.user?.name || "System"}</span>
                    <span className="text-xs text-stone-500">{row.original.user?.email}</span>
                </div>
            ),
        },
        {
            accessorKey: "action",
            header: "Action",
            cell: ({ row }) => (
                <Badge variant="outline" className="bg-stone-50 text-stone-600 border-stone-200">
                    {row.original.action}
                </Badge>
            ),
        },
        {
            accessorKey: "entityType",
            header: "Entity",
            cell: ({ row }) => <span className="text-stone-600 text-sm">{row.original.entityType}</span>,
        },
        {
            id: "details",
            header: "Details",
            cell: ({ row }) => (
                <pre className="max-w-[300px] overflow-hidden text-ellipsis text-[10px] text-stone-400 font-mono">
                    {JSON.stringify(row.original.details)}
                </pre>
            ),
        },
    ], []);

    return (
        <div className="space-y-6 p-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-stone-900">Audit Logs</h2>
                <p className="text-stone-500">Track system activity and user actions for security and compliance.</p>
            </div>

            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center p-20">
                        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
                    </div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={(data?.items as any[]) || []}
                        searchKey="user.email"
                        searchPlaceholder="Filter by user email..."
                    />
                )}
            </div>
        </div>
    );
}

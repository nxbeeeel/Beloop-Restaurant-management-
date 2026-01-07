"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowUpRight, ArrowDownLeft, Receipt, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface TransactionListProps {
    registerId: string;
    type?: "SALE" | "EXPENSE" | "WITHDRAWAL" | "PAYOUT" | "MANUAL" | "ALL";
}

interface Transaction {
    id: string;
    createdAt: string | Date;
    description: string;
    vendorName?: string | null;
    handedTo?: string | null;
    type: string;
    paymentMode: string;
    createdByName?: string | null;
    amount: any; // Handles Prisma Decimal type
    isInflow: boolean;
}

export function TransactionList({ registerId, type = "ALL" }: TransactionListProps) {
    const { data: transactions, isLoading } = trpc.dailyRegister.getTransactions.useQuery({
        registerId,
        type: type === "ALL" ? undefined : type,
    });

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!transactions || transactions.length === 0) {
        return (
            <div className="text-center p-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                No transactions found for this period.
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]">Time</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {transactions.map((tx: Transaction) => (
                    <TableRow key={tx.id}>
                        <TableCell className="font-medium text-muted-foreground">
                            {format(new Date(tx.createdAt), "h:mm a")}
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col">
                                <span className="font-medium">{tx.description}</span>
                                {(tx.vendorName || tx.handedTo) && (
                                    <span className="text-xs text-muted-foreground">
                                        {tx.vendorName ? `Vendor: ${tx.vendorName}` : `To: ${tx.handedTo}`}
                                    </span>
                                )}
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className={getTypeColor(tx.type)}>
                                {tx.type.replace("_", " ")}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-1.5 text-sm">
                                <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                                {tx.paymentMode}
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-1.5 text-sm">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                {tx.createdByName?.split(" ")[0]}
                            </div>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${tx.isInflow ? "text-green-600" : "text-red-600"
                            }`}>
                            {tx.isInflow ? "+" : "-"}₹{Number(tx.amount).toFixed(2)}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

function getTypeColor(type: string) {
    switch (type) {
        case "SALE": return "bg-green-50 text-green-700 border-green-200";
        case "EXPENSE": return "bg-orange-50 text-orange-700 border-orange-200";
        case "WITHDRAWAL": return "bg-red-50 text-red-700 border-red-200";
        case "PAYOUT": return "bg-blue-50 text-blue-700 border-blue-200";
        default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
}

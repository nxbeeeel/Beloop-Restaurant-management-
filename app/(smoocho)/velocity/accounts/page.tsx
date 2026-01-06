"use client";

import { useState, useEffect, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Download, Search, ArrowUpDown, Filter } from "lucide-react";

/**
 * SMOOCHO Velocity - Accounts Page
 * 
 * Excel-like ledger view of all financial transactions
 * Features:
 * - Instant loading with skeleton
 * - Sortable columns
 * - Search/filter
 * - Export to CSV
 */

// Format date
function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

// Format time
function formatTime(date: Date | string) {
    return new Date(date).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

// Format currency
function formatCurrency(amount: number) {
    return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

// Table skeleton
function TableSkeleton() {
    return (
        <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
                <div key={i} className="flex gap-4">
                    <div className="h-8 w-24 animate-pulse rounded bg-slate-700/50" />
                    <div className="h-8 w-20 animate-pulse rounded bg-slate-700/50" />
                    <div className="h-8 flex-1 animate-pulse rounded bg-slate-700/50" />
                    <div className="h-8 w-28 animate-pulse rounded bg-slate-700/50" />
                    <div className="h-8 w-20 animate-pulse rounded bg-slate-700/50" />
                </div>
            ))}
        </div>
    );
}

type SortField = "date" | "type" | "description" | "amount" | "balance";
type SortDirection = "asc" | "desc";

interface LedgerEntry {
    id: string;
    date: Date;
    type: "SALE" | "EXPENSE" | "TRANSFER_IN" | "TRANSFER_OUT" | "OPENING" | "CLOSING";
    description: string;
    debit: number;
    credit: number;
    balance: number;
    category?: string;
    reference?: string;
}

export default function AccountsPage() {
    const { user } = useUser();
    const [outletId, setOutletId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortField, setSortField] = useState<SortField>("date");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [typeFilter, setTypeFilter] = useState<string>("ALL");

    useEffect(() => {
        if (user?.publicMetadata?.outletId) {
            setOutletId(user.publicMetadata.outletId as string);
        }
    }, [user]);

    // Fetch all registers with transactions
    const { data: registers, isLoading: registersLoading } = api.velocity.getRegisters?.useQuery(
        { outletId: outletId!, limit: 30 },
        { enabled: !!outletId }
    ) ?? { data: null, isLoading: true };

    // Fetch transfers
    const { data: transfers, isLoading: transfersLoading } = api.velocity.getTransfers.useQuery(
        { outletId: outletId!, limit: 100 },
        { enabled: !!outletId }
    );

    // Build ledger entries from registers and transfers
    const ledgerEntries = useMemo(() => {
        const entries: LedgerEntry[] = [];
        let runningBalance = 0;

        // Add register transactions
        if (registers) {
            registers.forEach((register: {
                id: string;
                date: Date | string;
                openingCash: number | string;
                status: string;
                closingCash?: number | string | null;
                transactions: Array<{
                    id: string;
                    createdAt: Date | string;
                    type: string;
                    description?: string | null;
                    amount: number | string;
                    category?: { name: string } | null;
                    orderId?: string | null;
                    customerName?: string | null;
                }>;
            }) => {
                // Opening balance
                const opening = Number(register.openingCash);
                runningBalance += opening;
                entries.push({
                    id: `${register.id}-open`,
                    date: new Date(register.date),
                    type: "OPENING",
                    description: "Opening Balance",
                    debit: 0,
                    credit: opening,
                    balance: runningBalance,
                });

                // Transactions
                register.transactions.forEach((txn) => {
                    const amount = Number(txn.amount);
                    if (txn.type === "EXPENSE") {
                        runningBalance -= amount;
                        entries.push({
                            id: txn.id,
                            date: new Date(txn.createdAt),
                            type: "EXPENSE",
                            description: txn.description || txn.category?.name || "Expense",
                            debit: amount,
                            credit: 0,
                            balance: runningBalance,
                            category: txn.category?.name,
                            reference: txn.orderId || txn.customerName || undefined,
                        });
                    } else if (txn.type === "SALE") {
                        runningBalance += amount;
                        entries.push({
                            id: txn.id,
                            date: new Date(txn.createdAt),
                            type: "SALE",
                            description: "Cash Sale",
                            debit: 0,
                            credit: amount,
                            balance: runningBalance,
                        });
                    }
                });

                // Closing balance
                if (register.status === "CLOSED" && register.closingCash) {
                    entries.push({
                        id: `${register.id}-close`,
                        date: new Date(register.date),
                        type: "CLOSING",
                        description: `Closing Balance (Actual: ₹${Number(register.closingCash).toLocaleString("en-IN")})`,
                        debit: 0,
                        credit: 0,
                        balance: runningBalance,
                    });
                }
            });
        }

        // Add transfers
        if (transfers) {
            transfers.forEach((transfer: {
                id: string;
                createdAt: Date | string;
                amount: number | string;
                reason?: string | null;
                sourceWallet: { type: string; name: string };
                destinationWallet: { type: string; name: string };
            }) => {
                const amount = Number(transfer.amount);
                const isCashDrop = transfer.sourceWallet.type === "REGISTER";

                if (isCashDrop) {
                    entries.push({
                        id: transfer.id,
                        date: new Date(transfer.createdAt),
                        type: "TRANSFER_OUT",
                        description: `Cash Drop → ${transfer.destinationWallet.name}`,
                        debit: amount,
                        credit: 0,
                        balance: 0, // Will be recalculated
                        reference: transfer.reason || undefined,
                    });
                } else {
                    entries.push({
                        id: transfer.id,
                        date: new Date(transfer.createdAt),
                        type: "TRANSFER_IN",
                        description: `Replenishment ← ${transfer.sourceWallet.name}`,
                        debit: 0,
                        credit: amount,
                        balance: 0,
                        reference: transfer.reason || undefined,
                    });
                }
            });
        }

        // Sort by date
        entries.sort((a, b) => a.date.getTime() - b.date.getTime());

        // Recalculate running balance
        let balance = 0;
        entries.forEach((entry) => {
            balance += entry.credit - entry.debit;
            entry.balance = balance;
        });

        return entries;
    }, [registers, transfers]);

    // Filter and sort entries
    const filteredEntries = useMemo(() => {
        let filtered = [...ledgerEntries];

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(
                (e) =>
                    e.description.toLowerCase().includes(term) ||
                    e.category?.toLowerCase().includes(term) ||
                    e.reference?.toLowerCase().includes(term)
            );
        }

        // Apply type filter
        if (typeFilter !== "ALL") {
            filtered = filtered.filter((e) => e.type === typeFilter);
        }

        // Apply sort
        filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case "date":
                    comparison = a.date.getTime() - b.date.getTime();
                    break;
                case "type":
                    comparison = a.type.localeCompare(b.type);
                    break;
                case "description":
                    comparison = a.description.localeCompare(b.description);
                    break;
                case "amount":
                    comparison = (a.credit - a.debit) - (b.credit - b.debit);
                    break;
                case "balance":
                    comparison = a.balance - b.balance;
                    break;
            }
            return sortDirection === "asc" ? comparison : -comparison;
        });

        return filtered;
    }, [ledgerEntries, searchTerm, typeFilter, sortField, sortDirection]);

    // Export to CSV
    const exportToCSV = () => {
        const headers = ["Date", "Time", "Type", "Description", "Category", "Reference", "Debit", "Credit", "Balance"];
        const rows = filteredEntries.map((e) => [
            formatDate(e.date),
            formatTime(e.date),
            e.type,
            e.description,
            e.category || "",
            e.reference || "",
            e.debit || "",
            e.credit || "",
            e.balance,
        ]);

        const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `velocity-ledger-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
    };

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("desc");
        }
    };

    const isLoading = registersLoading || transfersLoading;

    // Totals
    const totals = useMemo(() => {
        return filteredEntries.reduce(
            (acc, e) => ({
                debit: acc.debit + e.debit,
                credit: acc.credit + e.credit,
            }),
            { debit: 0, credit: 0 }
        );
    }, [filteredEntries]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Accounts Ledger</h2>
                <Button
                    onClick={exportToCSV}
                    variant="outline"
                    className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                </Button>
            </div>

            {/* Filters */}
            <Card className="border-slate-700 bg-slate-800/50">
                <CardContent className="pt-4">
                    <div className="flex flex-wrap gap-4">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Search transactions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 border-slate-600 bg-slate-900"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-slate-400" />
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-[160px] border-slate-600 bg-slate-900">
                                    <SelectValue placeholder="Filter by type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Types</SelectItem>
                                    <SelectItem value="SALE">Sales</SelectItem>
                                    <SelectItem value="EXPENSE">Expenses</SelectItem>
                                    <SelectItem value="TRANSFER_OUT">Cash Drops</SelectItem>
                                    <SelectItem value="TRANSFER_IN">Replenishments</SelectItem>
                                    <SelectItem value="OPENING">Opening</SelectItem>
                                    <SelectItem value="CLOSING">Closing</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Ledger Table */}
            <Card className="border-slate-700 bg-slate-800/50 overflow-hidden">
                <CardHeader className="py-3 px-4 bg-slate-900/50">
                    <CardTitle className="text-sm font-medium text-slate-300">
                        {filteredEntries.length} transactions
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-4">
                            <TableSkeleton />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-700 hover:bg-transparent">
                                        <TableHead
                                            className="cursor-pointer text-slate-300 hover:text-white"
                                            onClick={() => toggleSort("date")}
                                        >
                                            <div className="flex items-center gap-1">
                                                Date
                                                <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-slate-300">Time</TableHead>
                                        <TableHead
                                            className="cursor-pointer text-slate-300 hover:text-white"
                                            onClick={() => toggleSort("type")}
                                        >
                                            <div className="flex items-center gap-1">
                                                Type
                                                <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </TableHead>
                                        <TableHead
                                            className="cursor-pointer text-slate-300 hover:text-white"
                                            onClick={() => toggleSort("description")}
                                        >
                                            <div className="flex items-center gap-1">
                                                Description
                                                <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-right text-rose-400">Debit (₹)</TableHead>
                                        <TableHead className="text-right text-emerald-400">Credit (₹)</TableHead>
                                        <TableHead
                                            className="cursor-pointer text-right text-slate-300 hover:text-white"
                                            onClick={() => toggleSort("balance")}
                                        >
                                            <div className="flex items-center justify-end gap-1">
                                                Balance
                                                <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredEntries.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-slate-400 py-8">
                                                No transactions found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        <>
                                            {filteredEntries.map((entry) => (
                                                <TableRow
                                                    key={entry.id}
                                                    className="border-slate-700/50 hover:bg-slate-800/50"
                                                >
                                                    <TableCell className="font-mono text-sm text-slate-300">
                                                        {formatDate(entry.date)}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm text-slate-400">
                                                        {formatTime(entry.date)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span
                                                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${entry.type === "SALE"
                                                                ? "bg-emerald-500/20 text-emerald-400"
                                                                : entry.type === "EXPENSE"
                                                                    ? "bg-rose-500/20 text-rose-400"
                                                                    : entry.type === "TRANSFER_OUT"
                                                                        ? "bg-amber-500/20 text-amber-400"
                                                                        : entry.type === "TRANSFER_IN"
                                                                            ? "bg-blue-500/20 text-blue-400"
                                                                            : "bg-slate-500/20 text-slate-400"
                                                                }`}
                                                        >
                                                            {entry.type.replace("_", " ")}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-white">
                                                        {entry.description}
                                                        {entry.category && (
                                                            <span className="ml-2 text-xs text-slate-500">
                                                                [{entry.category}]
                                                            </span>
                                                        )}
                                                        {entry.reference && (
                                                            <span className="ml-2 text-xs text-slate-500">
                                                                • {entry.reference}
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-rose-400">
                                                        {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-emerald-400">
                                                        {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono font-medium text-white">
                                                        {formatCurrency(entry.balance)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {/* Totals Row */}
                                            <TableRow className="border-t-2 border-slate-600 bg-slate-900/50 font-bold">
                                                <TableCell colSpan={4} className="text-right text-slate-300">
                                                    TOTALS
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-rose-400">
                                                    {formatCurrency(totals.debit)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-emerald-400">
                                                    {formatCurrency(totals.credit)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-white">
                                                    {formatCurrency(totals.credit - totals.debit)}
                                                </TableCell>
                                            </TableRow>
                                        </>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

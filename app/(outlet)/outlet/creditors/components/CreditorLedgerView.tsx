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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Download, ArrowUpRight, ArrowDownLeft, Plus } from "lucide-react";
import { RecordPaymentDialog } from "./RecordPaymentDialog";

interface CreditorLedgerViewProps {
    supplierId: string;
    outletId: string;
}

export function CreditorLedgerView({ supplierId, outletId }: CreditorLedgerViewProps) {
    const [page, setPage] = useState(0);
    const limit = 50;

    const { data, isLoading, refetch } = trpc.creditorLedger.getLedger.useQuery({
        supplierId,
        limit,
        offset: page * limit,
    });

    const [isExporting, setIsExporting] = useState(false);
    const exportQuery = trpc.creditorLedger.exportLedger.useQuery(
        { supplierId },
        { enabled: false }
    );

    const handleExport = async () => {
        setIsExporting(true);
        const result = await exportQuery.refetch();
        if (result.data) {
            const blob = new Blob([result.data.csv], { type: "text/csv" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = result.data.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
        setIsExporting(false);
    };

    if (isLoading && !data) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!data) return null;

    const { supplier, entries, currentBalance, hasMore } = data;

    return (
        <div className="space-y-6">
            {/* Header / Summary */}
            <Card className="bg-slate-50 border-slate-200">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold">{supplier?.name}</h2>
                            <p className="text-muted-foreground">Supplier Account Ledger</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium text-muted-foreground">Current Outstanding</p>
                            <div className={`text-3xl font-bold ${currentBalance > 0 ? "text-red-600" : "text-green-600"}`}>
                                ₹{currentBalance.toFixed(2)}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-2">
                        <RecordPaymentDialog
                            supplierId={supplierId}
                            supplierName={supplier?.name || ""}
                            currentBalance={currentBalance}
                            outletId={outletId}
                            onSuccess={refetch}
                        />

                        {/* Record Purchase Button (Placeholder for now, usually automated via POs but good to have) */}
                        <Button variant="outline" disabled>
                            <Plus className="h-4 w-4 mr-2" />
                            Record Purchase (Coming Soon)
                        </Button>

                        <Button
                            variant="secondary"
                            onClick={handleExport}
                            disabled={isExporting}
                        >
                            {isExporting ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4 mr-2" />
                            )}
                            Export CSV
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Ledger Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[120px]">Date</TableHead>
                                <TableHead>Particulars</TableHead>
                                <TableHead className="text-right text-red-600">Debit (Paid)</TableHead>
                                <TableHead className="text-right text-green-600">Credit (Purchased)</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entries.map((entry) => (
                                <TableRow key={entry.id}>
                                    <TableCell className="font-medium text-muted-foreground">
                                        {format(new Date(entry.date), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span>{entry.particulars}</span>
                                            {entry.notes && (
                                                <span className="text-xs text-muted-foreground italic">
                                                    {entry.notes}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {entry.debit > 0 && (
                                            <span className="text-red-600 flex items-center justify-end gap-1">
                                                <ArrowUpRight className="h-3 w-3" />
                                                ₹{entry.debit.toFixed(2)}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {entry.credit > 0 && (
                                            <span className="text-green-600 flex items-center justify-end gap-1">
                                                <ArrowDownLeft className="h-3 w-3" />
                                                ₹{entry.credit.toFixed(2)}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-gray-700">
                                        ₹{entry.balance.toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

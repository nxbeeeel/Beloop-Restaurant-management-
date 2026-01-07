"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CreditorList } from "./components/CreditorList";
import { CreditorLedgerView } from "./components/CreditorLedgerView";

interface CreditorLedgerClientProps {
    outletId: string;
    userRole: string;
}

export default function CreditorLedgerClient({ outletId, userRole }: CreditorLedgerClientProps) {
    const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

    // Fetch account summary
    const { data: summary, isLoading, refetch } = trpc.creditorLedger.getBalanceSummary.useQuery(undefined, {
        refetchInterval: 30000,
    });

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (selectedSupplierId) {
        return (
            <div className="space-y-6">
                <Button
                    variant="ghost"
                    onClick={() => setSelectedSupplierId(null)}
                    className="pl-0 gap-2 hover:bg-transparent hover:text-primary"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Creditors
                </Button>

                <CreditorLedgerView
                    supplierId={selectedSupplierId}
                    outletId={outletId}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Creditor Accounts</h1>
                    <p className="text-muted-foreground">
                        Manage supplier ledgers, track outstanding balances, and record purchases.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Total Outstanding Card */}
            <Card className="bg-red-50 border-red-100">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-red-600">Total Payable Outstanding</p>
                            <h2 className="text-3xl font-bold text-red-700 mt-2">
                                ₹{summary?.totalOwed.toFixed(2) || "0.00"}
                            </h2>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-red-700/50">
                                {summary?.supplierCount || 0}
                            </p>
                            <p className="text-xs text-red-600/70">Active Suppliers</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <CreditorList
                suppliers={summary?.suppliers || []}
                onSelect={setSelectedSupplierId}
            />
        </div>
    );
}

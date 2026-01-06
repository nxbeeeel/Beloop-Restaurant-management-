"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Wallet, Users, ArrowDownRight, ArrowUpRight, Vault } from "lucide-react";

/**
 * SMOOCHO Velocity - Owner's Eye Dashboard
 * 
 * Features:
 * - P&L View (Accrual Profit)
 * - Cash Flow View (Liquidity)
 * - Payables List (Suppliers owed money)
 * - Manager/Owner only access
 */

// Skeleton component
function Skeleton({ className = "" }: { className?: string }) {
    return <div className={`animate-pulse rounded-lg bg-slate-700/50 ${className}`} />;
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-28" />
                ))}
            </div>
            <Skeleton className="h-80" />
        </div>
    );
}

export default function DashboardPage() {
    const { user } = useUser();
    const [outletId] = useState<string>(user?.publicMetadata?.outletId as string || "");

    // Default to current month
    const now = new Date();
    const [startDate, setStartDate] = useState(
        new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
    );
    const [endDate, setEndDate] = useState(
        now.toISOString().split("T")[0]
    );

    // Fetch P&L Report
    const { data: plReport, isLoading: plLoading } = api.velocity.getPLReport.useQuery(
        { outletId, startDate, endDate },
        { enabled: !!outletId }
    );

    // Fetch Cash Flow Report
    const { data: cashFlowReport, isLoading: cashFlowLoading } = api.velocity.getCashFlowReport.useQuery(
        { outletId, startDate, endDate },
        { enabled: !!outletId }
    );

    // Fetch Payables
    const { data: payables, isLoading: payablesLoading } = api.velocity.getPayables.useQuery(
        { outletId },
        { enabled: !!outletId }
    );

    // Fetch Manager Safe Balance
    const { data: managerSafe } = api.velocity.getManagerSafeBalance.useQuery(
        { outletId },
        { enabled: !!outletId }
    );

    const isLoading = plLoading || cashFlowLoading || payablesLoading;

    if (isLoading) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">Owner&apos;s Dashboard</h2>
                <DashboardSkeleton />
            </div>
        );
    }

    const totalPayables = payables?.reduce((sum, s) => sum + s.balance, 0) || 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h2 className="text-2xl font-bold text-white">Owner&apos;s Dashboard</h2>

                {/* Date Range Picker */}
                <div className="flex gap-3">
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-400">From</Label>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="h-9 border-slate-600 bg-slate-900 text-white"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-400">To</Label>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="h-9 border-slate-600 bg-slate-900 text-white"
                        />
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-slate-700 bg-slate-800/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">Total Sales</p>
                                <p className="text-2xl font-bold text-white">
                                    ₹{(plReport?.totalSales || 0).toLocaleString("en-IN")}
                                </p>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20">
                                <TrendingUp className="h-6 w-6 text-emerald-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-700 bg-slate-800/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">Total Expenses</p>
                                <p className="text-2xl font-bold text-white">
                                    ₹{(plReport?.totalExpenses || 0).toLocaleString("en-IN")}
                                </p>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/20">
                                <TrendingDown className="h-6 w-6 text-rose-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-700 bg-slate-800/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">Net Profit</p>
                                <p className={`text-2xl font-bold ${(plReport?.netProfit || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                                    }`}>
                                    ₹{(plReport?.netProfit || 0).toLocaleString("en-IN")}
                                </p>
                            </div>
                            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${(plReport?.netProfit || 0) >= 0 ? "bg-emerald-500/20" : "bg-rose-500/20"
                                }`}>
                                <Wallet className={`h-6 w-6 ${(plReport?.netProfit || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                                    }`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-700 bg-slate-800/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">Payables</p>
                                <p className="text-2xl font-bold text-amber-400">
                                    ₹{totalPayables.toLocaleString("en-IN")}
                                </p>
                            </div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20">
                                <Users className="h-6 w-6 text-amber-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Manager's Cash in Hand - Accountability */}
            {managerSafe && managerSafe.balance > 0 && (
                <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-600/5">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/20">
                                    <Vault className="h-7 w-7 text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-amber-200">Cash in Your Hand</p>
                                    <p className="text-3xl font-bold text-white">
                                        ₹{managerSafe.balance.toLocaleString("en-IN")}
                                    </p>
                                    <p className="text-xs text-amber-300/70">
                                        You are accountable for this amount
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400">Manager Safe</p>
                                {!managerSafe.hasPin && (
                                    <p className="text-xs text-rose-400">⚠️ No PIN set</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Detailed Views */}
            <Tabs defaultValue="pl" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 bg-slate-800">
                    <TabsTrigger value="pl" className="data-[state=active]:bg-rose-500">
                        P&L View
                    </TabsTrigger>
                    <TabsTrigger value="cashflow" className="data-[state=active]:bg-rose-500">
                        Cash Flow
                    </TabsTrigger>
                    <TabsTrigger value="payables" className="data-[state=active]:bg-rose-500">
                        Payables
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pl">
                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardHeader>
                            <CardTitle className="text-white">Profit & Loss Statement</CardTitle>
                            <CardDescription className="text-slate-400">
                                Accrual-based profit calculation (Sales - Expenses regardless of payment)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                                    <div className="flex items-center gap-3">
                                        <ArrowUpRight className="h-5 w-5 text-emerald-400" />
                                        <span className="text-white">Total Revenue</span>
                                    </div>
                                    <span className="text-lg font-bold text-emerald-400">
                                        +₹{(plReport?.totalSales || 0).toLocaleString("en-IN")}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                                    <div className="flex items-center gap-3">
                                        <ArrowDownRight className="h-5 w-5 text-rose-400" />
                                        <span className="text-white">Total Expenses</span>
                                    </div>
                                    <span className="text-lg font-bold text-rose-400">
                                        -₹{(plReport?.totalExpenses || 0).toLocaleString("en-IN")}
                                    </span>
                                </div>

                                <div className="border-t border-slate-700 pt-4">
                                    <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-slate-800 to-slate-900 p-4">
                                        <span className="text-lg font-semibold text-white">Net Profit</span>
                                        <span className={`text-2xl font-bold ${(plReport?.netProfit || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                                            }`}>
                                            ₹{(plReport?.netProfit || 0).toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid gap-4 pt-4 md:grid-cols-2">
                                    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                                        <p className="text-sm text-slate-400">Days with Data</p>
                                        <p className="text-xl font-bold text-white">
                                            {plReport?.registerCount || 0} days
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                                        <p className="text-sm text-slate-400">Closed Registers</p>
                                        <p className="text-xl font-bold text-white">
                                            {plReport?.closedRegisters || 0}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="cashflow">
                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardHeader>
                            <CardTitle className="text-white">Cash Flow Statement</CardTitle>
                            <CardDescription className="text-slate-400">
                                Actual cash movements (Liquidity tracking)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                                    <div className="flex items-center gap-3">
                                        <ArrowUpRight className="h-5 w-5 text-emerald-400" />
                                        <span className="text-white">Cash In</span>
                                    </div>
                                    <span className="text-lg font-bold text-emerald-400">
                                        +₹{(cashFlowReport?.cashIn || 0).toLocaleString("en-IN")}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                                    <div className="flex items-center gap-3">
                                        <ArrowDownRight className="h-5 w-5 text-rose-400" />
                                        <span className="text-white">Cash Out</span>
                                    </div>
                                    <span className="text-lg font-bold text-rose-400">
                                        -₹{(cashFlowReport?.cashOut || 0).toLocaleString("en-IN")}
                                    </span>
                                </div>

                                <div className="border-t border-slate-700 pt-4">
                                    <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-slate-800 to-slate-900 p-4">
                                        <span className="text-lg font-semibold text-white">Net Cash Flow</span>
                                        <span className={`text-2xl font-bold ${(cashFlowReport?.netCashFlow || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                                            }`}>
                                            ₹{(cashFlowReport?.netCashFlow || 0).toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid gap-4 pt-4 md:grid-cols-2">
                                    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                                        <p className="text-sm text-slate-400">Total Variance</p>
                                        <p className={`text-xl font-bold ${Math.abs(cashFlowReport?.totalVariance || 0) > 100
                                            ? "text-amber-400"
                                            : "text-white"
                                            }`}>
                                            ₹{(cashFlowReport?.totalVariance || 0).toLocaleString("en-IN")}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                                        <p className="text-sm text-slate-400">Registers with Variance</p>
                                        <p className="text-xl font-bold text-white">
                                            {cashFlowReport?.registersWithVariance || 0}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payables">
                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardHeader>
                            <CardTitle className="text-white">Accounts Payable</CardTitle>
                            <CardDescription className="text-slate-400">
                                Suppliers you owe money to
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!payables || payables.length === 0 ? (
                                <div className="py-8 text-center text-slate-400">
                                    No outstanding payables! 🎉
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {payables.map((supplier) => (
                                        <div
                                            key={supplier.id}
                                            className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 p-4"
                                        >
                                            <div>
                                                <p className="font-medium text-white">{supplier.name}</p>
                                                {supplier.whatsappNumber && (
                                                    <a
                                                        href={`https://wa.me/${supplier.whatsappNumber.replace(/\D/g, "")}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm text-emerald-400 hover:underline"
                                                    >
                                                        WhatsApp: {supplier.whatsappNumber}
                                                    </a>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-amber-400">
                                                    ₹{supplier.balance.toLocaleString("en-IN")}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    Ordered: ₹{supplier.totalOrdered.toLocaleString("en-IN")}
                                                </p>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="border-t border-slate-700 pt-4">
                                        <div className="flex items-center justify-between rounded-lg bg-amber-500/10 p-4">
                                            <span className="font-semibold text-amber-200">Total Payable</span>
                                            <span className="text-xl font-bold text-amber-400">
                                                ₹{totalPayables.toLocaleString("en-IN")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

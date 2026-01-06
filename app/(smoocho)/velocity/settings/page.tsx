"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Lock, Shield, Check, AlertTriangle, Vault, Eye, EyeOff, ArrowRightLeft, ArrowRight, Clock, History } from "lucide-react";

/**
 * SMOOCHO Velocity - Settings Page
 * 
 * Features:
 * - Manager PIN Setup for Cash Drop authorization
 * - Transfer History
 */

// Skeleton component
function Skeleton({ className = "" }: { className?: string }) {
    return <div className={`animate-pulse rounded-lg bg-slate-700/50 ${className}`} />;
}

// Format date for display
function formatDate(date: Date | string) {
    const d = new Date(date);
    return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    });
}

export default function SettingsPage() {
    const { user } = useUser();
    const [outletId, setOutletId] = useState<string | null>(null);

    // PIN setup state
    const [newPin, setNewPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [showPin, setShowPin] = useState(false);

    useEffect(() => {
        if (user?.publicMetadata?.outletId) {
            setOutletId(user.publicMetadata.outletId as string);
        }
    }, [user]);

    // Fetch current wallet status
    const { data: managerSafe, isLoading, refetch } = api.velocity.getManagerSafeBalance.useQuery(
        { outletId: outletId! },
        { enabled: !!outletId }
    );

    // Fetch transfer history
    const { data: transfers, isLoading: transfersLoading } = api.velocity.getTransfers.useQuery(
        { outletId: outletId!, limit: 50 },
        { enabled: !!outletId }
    );

    // Set PIN mutation
    const setPinMutation = api.velocity.setManagerPin.useMutation({
        onSuccess: () => {
            toast.success("Manager PIN set successfully!");
            setNewPin("");
            setConfirmPin("");
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "Failed to set PIN");
        },
    });

    const handleSetPin = () => {
        if (!outletId || !newPin || newPin !== confirmPin) return;

        setPinMutation.mutate({
            outletId,
            pin: newPin
        });
    };

    const isPinValid = newPin.length === 4 && /^\d{4}$/.test(newPin);
    const pinsMatch = newPin === confirmPin;
    const canSubmit = isPinValid && pinsMatch && confirmPin.length === 4;

    if (isLoading || !outletId) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">Settings</h2>
                <Skeleton className="h-64" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Settings</h2>

            {/* Manager PIN Setup */}
            <Card className="border-slate-700 bg-slate-800/50">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
                            <Shield className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                            <CardTitle className="text-white">Manager PIN</CardTitle>
                            <CardDescription className="text-slate-400">
                                Required for authorizing Cash Drop transfers
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Current Status */}
                    <div className={`rounded-lg border p-4 ${managerSafe?.hasPin
                        ? "border-emerald-500/30 bg-emerald-500/10"
                        : "border-amber-500/30 bg-amber-500/10"
                        }`}>
                        <div className="flex items-center gap-3">
                            {managerSafe?.hasPin ? (
                                <>
                                    <Check className="h-5 w-5 text-emerald-400" />
                                    <div>
                                        <p className="font-medium text-emerald-200">PIN is configured</p>
                                        <p className="text-sm text-emerald-300/70">
                                            Cash Drop transfers are secured
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                                    <div>
                                        <p className="font-medium text-amber-200">PIN not set</p>
                                        <p className="text-sm text-amber-300/70">
                                            Staff cannot perform Cash Drop until PIN is configured
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Manager Safe Balance */}
                    {managerSafe && managerSafe.balance > 0 && (
                        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                            <div className="flex items-center gap-3">
                                <Vault className="h-5 w-5 text-amber-400" />
                                <div>
                                    <p className="text-sm text-slate-400">Current Safe Balance</p>
                                    <p className="text-xl font-bold text-white">
                                        ₹{managerSafe.balance.toLocaleString("en-IN")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PIN Setup Form */}
                    <div className="space-y-4 border-t border-slate-700 pt-6">
                        <h4 className="flex items-center gap-2 font-medium text-white">
                            <Lock className="h-4 w-4 text-amber-400" />
                            {managerSafe?.hasPin ? "Change PIN" : "Set New PIN"}
                        </h4>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-white">
                                    {managerSafe?.hasPin ? "New PIN" : "Enter PIN"}
                                </Label>
                                <div className="relative">
                                    <Input
                                        type={showPin ? "text" : "password"}
                                        maxLength={4}
                                        value={newPin}
                                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                                        placeholder="••••"
                                        className="h-14 border-slate-600 bg-slate-900 pr-12 text-center text-2xl tracking-widest"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowPin(!showPin)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                                    >
                                        {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                                {newPin && !isPinValid && (
                                    <p className="text-xs text-rose-400">
                                        PIN must be exactly 4 digits
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-white">Confirm PIN</Label>
                                <Input
                                    type={showPin ? "text" : "password"}
                                    maxLength={4}
                                    value={confirmPin}
                                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                                    placeholder="••••"
                                    className="h-14 border-slate-600 bg-slate-900 text-center text-2xl tracking-widest"
                                />
                                {confirmPin && !pinsMatch && (
                                    <p className="text-xs text-rose-400">
                                        PINs do not match
                                    </p>
                                )}
                                {confirmPin && pinsMatch && isPinValid && (
                                    <p className="flex items-center gap-1 text-xs text-emerald-400">
                                        <Check className="h-3 w-3" />
                                        PINs match
                                    </p>
                                )}
                            </div>
                        </div>

                        <Button
                            onClick={handleSetPin}
                            disabled={!canSubmit || setPinMutation.isPending}
                            className="h-12 w-full bg-amber-500 hover:bg-amber-600"
                        >
                            {setPinMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Shield className="mr-2 h-4 w-4" />
                            )}
                            {managerSafe?.hasPin ? "Update Manager PIN" : "Set Manager PIN"}
                        </Button>

                        <p className="text-center text-xs text-slate-400">
                            This PIN will be required when staff initiates a Cash Drop
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Transfer History */}
            <Card className="border-slate-700 bg-slate-800/50">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                            <History className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <CardTitle className="text-white">Transfer History</CardTitle>
                            <CardDescription className="text-slate-400">
                                All Cash Drops and Replenishments
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {transfersLoading ? (
                        <div className="space-y-3">
                            <Skeleton className="h-16" />
                            <Skeleton className="h-16" />
                            <Skeleton className="h-16" />
                        </div>
                    ) : !transfers || transfers.length === 0 ? (
                        <div className="py-8 text-center text-slate-400">
                            <ArrowRightLeft className="mx-auto mb-3 h-12 w-12 opacity-50" />
                            <p>No transfers yet</p>
                            <p className="text-sm">Cash Drops and Replenishments will appear here</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {transfers.map((transfer) => {
                                const isCashDrop = transfer.sourceWallet.type === "REGISTER";
                                return (
                                    <div
                                        key={transfer.id}
                                        className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 p-4"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isCashDrop
                                                    ? "bg-amber-500/20"
                                                    : "bg-emerald-500/20"
                                                }`}>
                                                {isCashDrop ? (
                                                    <ArrowRight className="h-5 w-5 text-amber-400" />
                                                ) : (
                                                    <ArrowRight className="h-5 w-5 rotate-180 text-emerald-400" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">
                                                    {isCashDrop ? "Cash Drop" : "Replenishment"}
                                                </p>
                                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                                    <span>{transfer.sourceWallet.name}</span>
                                                    <ArrowRight className="h-3 w-3" />
                                                    <span>{transfer.destinationWallet.name}</span>
                                                </div>
                                                {transfer.reason && (
                                                    <p className="text-xs text-slate-500">{transfer.reason}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-lg font-bold ${isCashDrop ? "text-amber-400" : "text-emerald-400"
                                                }`}>
                                                {isCashDrop ? "-" : "+"}₹{Number(transfer.amount).toLocaleString("en-IN")}
                                            </p>
                                            <p className="flex items-center justify-end gap-1 text-xs text-slate-500">
                                                <Clock className="h-3 w-3" />
                                                {formatDate(transfer.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}

                            {transfers.length >= 50 && (
                                <p className="text-center text-xs text-slate-500">
                                    Showing last 50 transfers
                                </p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Bell, AlertTriangle, Save } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";

export default function SecurityPermissionsPage() {
    const { toast } = useToast();
    const utils = trpc.useUtils();

    const { data: settings, isLoading } = trpc.security.getSettings.useQuery({});

    const [formData, setFormData] = useState({
        editOrderRequiresPIN: true,
        voidOrderRequiresPIN: true,
        withdrawalRequiresPIN: true,
        priceOverrideRequiresPIN: true,
        stockAdjustmentRequiresPIN: false,
        refundRequiresPIN: true,
        modifyClosingRequiresPIN: true,
        supplierPaymentRequiresPIN: true,
        manualDiscountRequiresPIN: false,
        manualDiscountThreshold: 20,
        varianceThreshold: 100,
    });

    useEffect(() => {
        if (settings) {
            setFormData({
                editOrderRequiresPIN: settings.editOrderRequiresPIN ?? true,
                voidOrderRequiresPIN: settings.voidOrderRequiresPIN ?? true,
                withdrawalRequiresPIN: settings.withdrawalRequiresPIN ?? true,
                priceOverrideRequiresPIN: settings.priceOverrideRequiresPIN ?? true,
                stockAdjustmentRequiresPIN: settings.stockAdjustmentRequiresPIN ?? false,
                refundRequiresPIN: settings.refundRequiresPIN ?? true,
                modifyClosingRequiresPIN: settings.modifyClosingRequiresPIN ?? true,
                supplierPaymentRequiresPIN: settings.supplierPaymentRequiresPIN ?? true,
                manualDiscountRequiresPIN: settings.manualDiscountRequiresPIN ?? false,
                manualDiscountThreshold: settings.manualDiscountThreshold ? Number(settings.manualDiscountThreshold) : 20,
                varianceThreshold: settings.varianceThreshold ? Number(settings.varianceThreshold) : 100,
            });
        }
    }, [settings]);

    const updateMutation = trpc.security.updateSettings.useMutation({
        onSuccess: () => {
            toast({ title: "Settings Saved", description: "Security settings have been updated." });
            utils.security.getSettings.invalidate();
        },
        onError: (err) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const handleSave = () => {
        if (!settings?.outletId) return;
        updateMutation.mutate({
            outletId: settings.outletId,
            ...formData,
        });
    };

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-8 w-48" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-40" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="flex justify-between items-center">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-6 w-12" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        );
    }

    const pinSettings = [
        { key: "editOrderRequiresPIN", label: "Edit Order", desc: "Require PIN to modify existing orders" },
        { key: "voidOrderRequiresPIN", label: "Void Order", desc: "Require PIN to void/cancel orders" },
        { key: "withdrawalRequiresPIN", label: "Cash Withdrawal", desc: "Require PIN for cash withdrawals" },
        { key: "priceOverrideRequiresPIN", label: "Price Override", desc: "Require PIN to change item prices" },
        { key: "stockAdjustmentRequiresPIN", label: "Stock Adjustment", desc: "Require PIN for inventory adjustments" },
        { key: "refundRequiresPIN", label: "Process Refund", desc: "Require PIN to process refunds" },
        { key: "modifyClosingRequiresPIN", label: "Modify Closing", desc: "Require PIN for daily closing changes" },
        { key: "supplierPaymentRequiresPIN", label: "Supplier Payment", desc: "Require PIN for supplier payments" },
        { key: "manualDiscountRequiresPIN", label: "Manual Discount", desc: "Require PIN for manual discounts" },
    ];

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Shield className="h-8 w-8 text-primary" />
                    <h1 className="text-2xl font-bold">Security Permissions</h1>
                </div>
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        PIN Requirements
                    </CardTitle>
                    <CardDescription>Configure which actions require PIN verification</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {pinSettings.map((setting) => (
                        <div key={setting.key} className="flex justify-between items-center py-2 border-b last:border-0">
                            <div>
                                <p className="font-medium">{setting.label}</p>
                                <p className="text-sm text-muted-foreground">{setting.desc}</p>
                            </div>
                            <Switch
                                checked={formData[setting.key as keyof typeof formData] as boolean}
                                onCheckedChange={(checked: boolean) =>
                                    setFormData((prev) => ({ ...prev, [setting.key]: checked }))
                                }
                            />
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Thresholds
                    </CardTitle>
                    <CardDescription>Set limits for automatic PIN requirements</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Manual Discount Threshold (%)</label>
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                value={formData.manualDiscountThreshold}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, manualDiscountThreshold: Number(e.target.value) }))
                                }
                                className="mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Require PIN if discount exceeds this percentage
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Cash Variance Threshold (₹)</label>
                            <Input
                                type="number"
                                min="0"
                                value={formData.varianceThreshold}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, varianceThreshold: Number(e.target.value) }))
                                }
                                className="mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Require PIN if closing variance exceeds this amount
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

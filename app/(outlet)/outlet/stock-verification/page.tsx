"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useOutlet } from "@/hooks/use-outlet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
    ClipboardCheck,
    Sunrise,
    Sunset,
    IndianRupee,
    Package,
    Save,
    AlertTriangle,
    CheckCircle2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton-loaders";

// Cash denomination values in India
const DENOMINATIONS = [
    { value: 500, label: "₹500" },
    { value: 200, label: "₹200" },
    { value: 100, label: "₹100" },
    { value: 50, label: "₹50" },
    { value: 20, label: "₹20" },
    { value: 10, label: "₹10" },
];

export default function StockVerificationPage() {
    const { outletId, isLoading: userLoading, user } = useOutlet();
    const today = new Date().toISOString().split("T")[0];

    // States for opening verification
    const [openingDenominations, setOpeningDenominations] = useState<Record<number, string>>({});
    const [openingStockNotes, setOpeningStockNotes] = useState("");

    // States for closing verification  
    const [closingDenominations, setClosingDenominations] = useState<Record<number, string>>({});
    const [closingStockNotes, setClosingStockNotes] = useState("");

    // Fetch low stock items for quick verification
    const { data: lowStockItems, isLoading: stockLoading } = trpc.inventory.getLowStock.useQuery(
        { outletId: outletId || "" },
        { enabled: !!outletId }
    );

    // Calculate total from denominations
    const calculateTotal = (denominations: Record<number, string>) => {
        return Object.entries(denominations).reduce((sum, [denom, count]) => {
            return sum + (Number(denom) * (Number(count) || 0));
        }, 0);
    };

    const openingTotal = calculateTotal(openingDenominations);
    const closingTotal = calculateTotal(closingDenominations);

    const handleDenominationChange = (
        type: 'opening' | 'closing',
        denomination: number,
        count: string
    ) => {
        if (type === 'opening') {
            setOpeningDenominations(prev => ({ ...prev, [denomination]: count }));
        } else {
            setClosingDenominations(prev => ({ ...prev, [denomination]: count }));
        }
    };

    const handleSaveOpening = () => {
        if (openingTotal === 0) {
            toast.error("Please enter cash denominations");
            return;
        }
        // TODO: Save to backend
        toast.success(`Opening cash verified: ₹${openingTotal.toLocaleString('en-IN')}`);
    };

    const handleSaveClosing = () => {
        if (closingTotal === 0) {
            toast.error("Please enter cash denominations");
            return;
        }
        // TODO: Save to backend
        toast.success(`Closing cash verified: ₹${closingTotal.toLocaleString('en-IN')}`);
    };

    if (userLoading) {
        return (
            <div className="space-y-6 pb-20">
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-64" />
                    <Skeleton className="h-64" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 md:pb-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <ClipboardCheck className="h-7 w-7 text-primary" />
                        Stock Verification
                    </h1>
                    <p className="text-gray-500 text-sm">Verify cash and stock at opening and closing</p>
                </div>
                <Badge variant="secondary" className="bg-gray-100 text-gray-700 w-fit">
                    {new Date(today).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </Badge>
            </div>

            {/* Opening & Closing Tabs */}
            <Tabs defaultValue="opening" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="opening" className="flex items-center gap-2">
                        <Sunrise className="h-4 w-4" />
                        Opening
                    </TabsTrigger>
                    <TabsTrigger value="closing" className="flex items-center gap-2">
                        <Sunset className="h-4 w-4" />
                        Closing
                    </TabsTrigger>
                </TabsList>

                {/* Opening Tab */}
                <TabsContent value="opening" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Cash Verification */}
                        <Card className="bg-amber-50 border-amber-200">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <IndianRupee className="h-5 w-5 text-amber-600" />
                                    Opening Cash Count
                                </CardTitle>
                                <CardDescription>Count cash in register at start of day</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    {DENOMINATIONS.map(({ value, label }) => (
                                        <div key={value} className="flex items-center gap-2">
                                            <Label className="w-16 text-sm font-medium">{label}</Label>
                                            <span className="text-gray-400">×</span>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={openingDenominations[value] || ""}
                                                onChange={(e) => handleDenominationChange('opening', value, e.target.value)}
                                                placeholder="0"
                                                className="w-20 text-center"
                                            />
                                            <span className="text-sm text-gray-500 w-20">
                                                = ₹{((Number(openingDenominations[value]) || 0) * value).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-4 border-t border-amber-200">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-gray-900">Total Cash</span>
                                        <span className="text-2xl font-bold text-amber-600">
                                            ₹{openingTotal.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Stock Quick Check */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Package className="h-5 w-5 text-gray-600" />
                                    Stock Quick Check
                                </CardTitle>
                                <CardDescription>Items needing attention</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {stockLoading ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-8 w-full" />
                                        <Skeleton className="h-8 w-full" />
                                    </div>
                                ) : lowStockItems?.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                                        <p className="font-medium">All stock levels OK</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {lowStockItems?.slice(0, 8).map((item: any) => (
                                            <div key={item.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                                                <span className="text-sm font-medium">{item.name}</span>
                                                <Badge variant="destructive" className="text-xs">
                                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                                    Low: {item.stock}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="mt-4">
                                    <Label className="text-sm">Notes</Label>
                                    <Input
                                        value={openingStockNotes}
                                        onChange={(e) => setOpeningStockNotes(e.target.value)}
                                        placeholder="Any discrepancies or observations..."
                                        className="mt-1"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Button onClick={handleSaveOpening} className="w-full md:w-auto" size="lg">
                        <Save className="h-4 w-4 mr-2" />
                        Save Opening Verification
                    </Button>
                </TabsContent>

                {/* Closing Tab */}
                <TabsContent value="closing" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Cash Verification */}
                        <Card className="bg-indigo-50 border-indigo-200">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <IndianRupee className="h-5 w-5 text-indigo-600" />
                                    Closing Cash Count
                                </CardTitle>
                                <CardDescription>Count cash in register at end of day</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    {DENOMINATIONS.map(({ value, label }) => (
                                        <div key={value} className="flex items-center gap-2">
                                            <Label className="w-16 text-sm font-medium">{label}</Label>
                                            <span className="text-gray-400">×</span>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={closingDenominations[value] || ""}
                                                onChange={(e) => handleDenominationChange('closing', value, e.target.value)}
                                                placeholder="0"
                                                className="w-20 text-center"
                                            />
                                            <span className="text-sm text-gray-500 w-20">
                                                = ₹{((Number(closingDenominations[value]) || 0) * value).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-4 border-t border-indigo-200">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-gray-900">Total Cash</span>
                                        <span className="text-2xl font-bold text-indigo-600">
                                            ₹{closingTotal.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Stock Verification */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Package className="h-5 w-5 text-gray-600" />
                                    Stock End-of-Day
                                </CardTitle>
                                <CardDescription>Verify remaining stock levels</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {stockLoading ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-8 w-full" />
                                        <Skeleton className="h-8 w-full" />
                                    </div>
                                ) : lowStockItems?.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                                        <p className="font-medium">All stock levels OK</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {lowStockItems?.slice(0, 8).map((item: any) => (
                                            <div key={item.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                                                <span className="text-sm font-medium">{item.name}</span>
                                                <Badge variant="destructive" className="text-xs">
                                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                                    Low: {item.stock}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="mt-4">
                                    <Label className="text-sm">Closing Notes</Label>
                                    <Input
                                        value={closingStockNotes}
                                        onChange={(e) => setClosingStockNotes(e.target.value)}
                                        placeholder="Wastage, discrepancies, handover notes..."
                                        className="mt-1"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Button onClick={handleSaveClosing} className="w-full md:w-auto" size="lg">
                        <Save className="h-4 w-4 mr-2" />
                        Save Closing Verification
                    </Button>
                </TabsContent>
            </Tabs>
        </div>
    );
}

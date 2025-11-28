"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, Save, AlertCircle } from "lucide-react";
import Link from "next/link";

interface Product {
    id: string;
    name: string;
    currentStock: number;
    unit: string;
}

interface Discrepancy {
    product: Product;
    counted: number;
    current: number;
    difference: number;
}

export default function StockCountPage() {
    const [counts, setCounts] = useState<Map<string, number>>(new Map());
    const [notes, setNotes] = useState("");
    const [showConfirm, setShowConfirm] = useState(false);

    const { data: user } = trpc.dashboard.getUser.useQuery();
    const outletId = user?.outletId || "";

    const utils = trpc.useUtils();

    const { data: products, isLoading } = trpc.products.list.useQuery(
        { outletId },
        { enabled: !!outletId }
    );

    const submitCheckMutation = trpc.inventory.submitCheck.useMutation({
        onSuccess: () => {
            utils.products.list.invalidate();
            setCounts(new Map());
            setNotes("");
            setShowConfirm(false);
            alert("Stock check completed successfully!");
        }
    });

    const updateCount = (productId: string, value: number) => {
        const newCounts = new Map(counts);
        newCounts.set(productId, value);
        setCounts(newCounts);
    };

    const handleSubmit = () => {
        const items = Array.from(counts.entries()).map(([productId, countedQty]) => ({
            productId,
            countedQty
        }));

        if (items.length === 0) {
            alert("Please count at least one item");
            return;
        }

        submitCheckMutation.mutate({
            outletId,
            items,
            notes
        });
    };

    // Calculate discrepancies
    const discrepancies = products?.map(product => {
        const counted = counts.get(product.id);
        if (counted === undefined) return null;

        const diff = counted - product.currentStock;
        if (diff === 0) return null;

        return {
            product,
            counted,
            current: product.currentStock,
            difference: diff
        };
    }).filter(Boolean) as Discrepancy[] || [];

    const totalDiscrepancies = discrepancies.length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Daily Stock Count</h1>
                    <p className="text-gray-500">Perform physical inventory count and reconcile stock levels.</p>
                </div>
                <Link href="/outlet/inventory">
                    <Button variant="outline">← Back to Inventory</Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Count Form */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ClipboardCheck className="w-5 h-5" />
                                Count Items
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <p className="text-gray-500">Loading products...</p>
                            ) : products && products.length > 0 ? (
                                <div className="space-y-3">
                                    {products.map((product) => {
                                        const counted = counts.get(product.id);
                                        const hasDiff = counted !== undefined && counted !== product.currentStock;

                                        return (
                                            <div key={product.id} className={`flex items-center justify-between p-3 border rounded-lg ${hasDiff ? 'border-orange-300 bg-orange-50' : 'hover:bg-gray-50'}`}>
                                                <div className="flex-1">
                                                    <h3 className="font-medium">{product.name}</h3>
                                                    <p className="text-sm text-gray-500">
                                                        System Stock: {product.currentStock} {product.unit}
                                                    </p>
                                                    {hasDiff && (
                                                        <p className="text-xs text-orange-600 font-medium mt-1">
                                                            Difference: {counted! - product.currentStock > 0 ? '+' : ''}{(counted! - product.currentStock).toFixed(2)} {product.unit}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="Count"
                                                        className="w-28"
                                                        value={counted !== undefined ? counted : ""}
                                                        onChange={(e) => updateCount(product.id, parseFloat(e.target.value) || 0)}
                                                    />
                                                    <span className="text-sm text-gray-500 w-12">{product.unit}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-center py-8 text-gray-500">No products to count</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Summary & Submit */}
                <div>
                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle>Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Total Items:</span>
                                    <span className="font-medium">{products?.length || 0}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Counted:</span>
                                    <span className="font-medium">{counts.size}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Discrepancies:</span>
                                    <span className={`font-medium ${totalDiscrepancies > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                        {totalDiscrepancies}
                                    </span>
                                </div>
                            </div>

                            {totalDiscrepancies > 0 && (
                                <div className="border-t pt-3">
                                    <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        Items with differences:
                                    </p>
                                    <div className="space-y-1 max-h-48 overflow-y-auto">
                                        {discrepancies.map((item: Discrepancy) => (
                                            <div key={item.product.id} className="text-xs bg-orange-50 p-2 rounded">
                                                <p className="font-medium">{item.product.name}</p>
                                                <p className="text-gray-600">
                                                    {item.current} → {item.counted}
                                                    <span className={item.difference > 0 ? 'text-green-600' : 'text-red-600'}>
                                                        {' '}({item.difference > 0 ? '+' : ''}{item.difference.toFixed(2)})
                                                    </span>
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2 border-t pt-3">
                                <Label className="text-sm">Notes (Optional)</Label>
                                <textarea
                                    className="w-full border rounded-md p-2 text-sm"
                                    rows={3}
                                    placeholder="Any observations or reasons for discrepancies..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>

                            <Button
                                className="w-full"
                                onClick={() => setShowConfirm(true)}
                                disabled={counts.size === 0}
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Submit Count
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md bg-white shadow-xl">
                        <CardHeader>
                            <CardTitle>Confirm Stock Count</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-sm text-yellow-800">
                                    <strong>Warning:</strong> This will update your system stock levels to match the counted quantities.
                                </p>
                            </div>

                            <div className="space-y-2 text-sm">
                                <p><strong>Items counted:</strong> {counts.size}</p>
                                <p><strong>Discrepancies:</strong> {totalDiscrepancies}</p>
                                {notes && (
                                    <div>
                                        <strong>Notes:</strong>
                                        <p className="text-gray-600 mt-1">{notes}</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button variant="outline" onClick={() => setShowConfirm(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSubmit} disabled={submitCheckMutation.isPending}>
                                    {submitCheckMutation.isPending ? "Submitting..." : "Confirm & Submit"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

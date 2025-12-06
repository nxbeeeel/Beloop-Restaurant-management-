"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useWastage } from "./useWastage";

export default function WastageLog({ outletId }: { outletId: string }) {
    const {
        productId, setProductId,
        qty, setQty,
        reason, setReason,
        products,
        wastageHistory,
        submitWastage,
        isSubmitting
    } = useWastage(outletId);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/outlet/inventory">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Trash2 className="h-6 w-6 text-red-500" />
                        Wastage Tracking
                    </h1>
                    <p className="text-gray-500">Log spoiled, damaged, or wasted items.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Log Form */}
                <Card className="md:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle>Log New Wastage</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submitWastage} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Product</label>
                                <Select value={productId} onValueChange={setProductId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products?.map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name} ({p.currentStock} {p.unit})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Quantity Wasted</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={qty}
                                    onChange={(e) => setQty(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Reason</label>
                                <Select value={reason} onValueChange={setReason}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Reason" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Expired">Expired</SelectItem>
                                        <SelectItem value="Damaged">Damaged</SelectItem>
                                        <SelectItem value="Spilled">Spilled / Dropped</SelectItem>
                                        <SelectItem value="Quality Issue">Quality Issue</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="pt-4">
                                <Button
                                    type="submit"
                                    className="w-full bg-red-600 hover:bg-red-700"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "Recording..." : "Record Wastage"}
                                </Button>
                                <p className="text-xs text-gray-500 mt-2 text-center">
                                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                                    This will reduce stock levels immediately.
                                </p>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* History */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Recent Wastage Logs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Date</th>
                                        <th className="px-4 py-3 text-left">Product</th>
                                        <th className="px-4 py-3 text-right">Qty</th>
                                        <th className="px-4 py-3 text-left">Reason</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {wastageHistory?.map((log) => (
                                        <tr key={log.id}>
                                            <td className="px-4 py-3 text-gray-500">
                                                {new Date(log.date).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 font-medium">
                                                {log.product.name}
                                            </td>
                                            <td className="px-4 py-3 text-right text-red-600 font-medium">
                                                -{log.qty} {log.product.unit}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                                                    {log.reason}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {wastageHistory?.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-gray-500">
                                                No wastage recorded yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

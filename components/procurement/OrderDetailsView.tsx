"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, Truck, Calendar } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function OrderDetailsView({ orderId }: { orderId: string }) {
    const utils = trpc.useUtils();

    // Local state for received quantities
    const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>({});

    const { data: order, isLoading } = trpc.procurement.getOrder.useQuery({ orderId });

    const receiveOrder = trpc.procurement.receiveOrder.useMutation({
        onSuccess: () => {
            toast.success("Items received and stock updated!");
            utils.procurement.getOrder.invalidate({ orderId });
            setReceivedQtys({}); // Reset inputs
        },
        onError: (e) => toast.error(e.message)
    });

    if (isLoading) return <div className="text-center py-12">Loading order details...</div>;
    if (!order) return <div className="text-center py-12">Order not found</div>;

    const isReceivable = order.status === 'SENT' || order.status === 'PARTIALLY_RECEIVED';

    const handleReceiveSubmit = () => {
        const itemsToReceive = Object.entries(receivedQtys)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            .filter(([_key, qty]) => qty > 0)
            .map(([itemId, qty]) => ({ itemId, receivedQty: qty }));

        if (itemsToReceive.length === 0) {
            return toast.error("Please enter received quantities");
        }

        receiveOrder.mutate({
            orderId,
            receivedItems: itemsToReceive
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'DRAFT': return <Badge variant="outline">Draft</Badge>;
            case 'SENT': return <Badge className="bg-blue-500">Sent</Badge>;
            case 'PARTIALLY_RECEIVED': return <Badge className="bg-orange-500">Partial</Badge>;
            case 'RECEIVED': return <Badge className="bg-green-500">Received</Badge>;
            case 'VERIFIED': return <Badge className="bg-green-700">Verified</Badge>;
            case 'CANCELLED': return <Badge variant="destructive">Cancelled</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/outlet/orders">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            Order #{order.id.slice(-6)}
                            {getStatusBadge(order.status)}
                        </h1>
                        <p className="text-gray-500 flex items-center gap-2 mt-1">
                            <Truck className="h-4 w-4" /> {order.supplier?.name || 'No Supplier'}
                            <span className="mx-2">•</span>
                            <Calendar className="h-4 w-4" /> {format(new Date(order.createdAt), "PPP")}
                        </p>
                    </div>
                </div>
                {isReceivable && (
                    <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={handleReceiveSubmit}
                        disabled={receiveOrder.isPending}
                    >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirm Receipt
                    </Button>
                )}
            </div>

            {/* Items Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left">Product</th>
                                    <th className="px-4 py-3 text-right">Ordered</th>
                                    <th className="px-4 py-3 text-right">Received So Far</th>
                                    <th className="px-4 py-3 text-right">Remaining</th>
                                    {isReceivable && (
                                        <th className="px-4 py-3 text-right w-32 bg-green-50 text-green-700">Receive Now</th>
                                    )}
                                    <th className="px-4 py-3 text-right">Unit Cost</th>
                                    <th className="px-4 py-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {order.items.map((item) => {
                                    // Note: receivedQty not in schema, so we can't track received quantities per item
                                    // For now, show ordered quantity only
                                    const remaining = item.qty; // Always show full qty since we can't track received
                                    return (
                                        <tr key={item.id}>
                                            <td className="px-4 py-3 font-medium">{item.product?.name || item.productName}</td>
                                            <td className="px-4 py-3 text-right">{item.qty}</td>
                                            <td className="px-4 py-3 text-right">-</td>
                                            <td className="px-4 py-3 text-right font-semibold">
                                                {item.qty}
                                            </td>
                                            {isReceivable && (
                                                <td className="px-4 py-2 bg-green-50">
                                                    {remaining > 0 && (
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max={remaining}
                                                            className="text-right h-8 bg-white"
                                                            placeholder="0"
                                                            value={receivedQtys[item.id] || ""}
                                                            onChange={(e) => {
                                                                const val = Number(e.target.value);
                                                                if (val <= remaining) {
                                                                    setReceivedQtys({ ...receivedQtys, [item.id]: val });
                                                                }
                                                            }}
                                                        />
                                                    )}
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-right">${Number(item.unitCost).toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right">${(item.qty * Number(item.unitCost)).toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-gray-50 font-semibold">
                                <tr>
                                    <td colSpan={isReceivable ? 6 : 5} className="px-4 py-3 text-right">Total Order Value:</td>
                                    <td className="px-4 py-3 text-right text-lg">
                                        ${Number(order.totalAmount).toFixed(2)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}

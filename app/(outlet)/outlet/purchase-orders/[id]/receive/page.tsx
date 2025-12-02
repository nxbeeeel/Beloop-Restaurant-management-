"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";

export default function ReceiveOrderPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.id as string;

    const { data: order, isLoading } = trpc.procurement.getOrder.useQuery({ orderId });

    const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>({});

    const receiveMutation = trpc.procurement.receiveOrder.useMutation({
        onSuccess: () => {
            toast.success("Order received successfully");
            router.push("/outlet/purchase-orders");
        },
        onError: (err) => toast.error(err.message)
    });

    const handleQtyChange = (itemId: string, qty: string) => {
        setReceivedQtys(prev => ({
            ...prev,
            [itemId]: parseFloat(qty) || 0
        }));
    };

    const handleReceive = () => {
        const itemsToReceive = Object.entries(receivedQtys).map(([itemId, qty]) => ({
            itemId,
            receivedQty: qty
        })).filter(i => i.receivedQty > 0);

        if (itemsToReceive.length === 0) {
            toast.error("Please enter received quantities");
            return;
        }

        receiveMutation.mutate({
            orderId,
            receivedItems: itemsToReceive
        });
    };

    const handleReceiveAll = () => {
        if (!order) return;
        const allItems = order.items.map(item => ({
            itemId: item.id,
            receivedQty: item.qty
        }));

        receiveMutation.mutate({
            orderId,
            receivedItems: allItems
        });
    };

    if (isLoading) return <div className="text-center py-12">Loading...</div>;
    if (!order) return <div className="text-center py-12">Order not found</div>;

    return (
        <div className="space-y-6 pb-24 lg:pb-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Receive Order #{order.id.slice(-6)}</h1>
                    <p className="text-gray-500">Supplier: {order.supplier?.name}</p>
                </div>
                <Badge variant={order.status === "RECEIVED" ? "default" : "secondary"}>
                    {order.status}
                </Badge>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Items</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4">
                        {order.items.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                                <div>
                                    <p className="font-medium">{item.productName}</p>
                                    <p className="text-sm text-gray-500">
                                        Ordered: {item.qty} {item.product?.unit || item.ingredient?.purchaseUnit}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-32">
                                        <Input
                                            type="number"
                                            placeholder="Received Qty"
                                            value={receivedQtys[item.id] || ""}
                                            onChange={(e) => handleQtyChange(item.id, e.target.value)}
                                            disabled={order.status === "RECEIVED"}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {order.status !== "RECEIVED" && (
                        <div className="flex justify-end gap-4 pt-4 border-t">
                            <Button variant="outline" onClick={handleReceiveAll} disabled={receiveMutation.isPending}>
                                Receive All
                            </Button>
                            <Button onClick={handleReceive} disabled={receiveMutation.isPending}>
                                {receiveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                Confirm Receipt
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

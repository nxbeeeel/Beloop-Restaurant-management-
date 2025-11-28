"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, Package, Truck, Clock } from "lucide-react";
import { format } from "date-fns";

export default function PurchaseOrderList({ outletId }: { outletId: string }) {
    const [statusFilter, setStatusFilter] = useState<string | null>(null);

    const { data: orders, isLoading } = trpc.procurement.listOrders.useQuery({
        outletId,
        status: statusFilter as any
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'DRAFT': return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">Draft</Badge>;
            case 'SENT': return <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-0">Sent</Badge>;
            case 'PARTIALLY_RECEIVED': return <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-0">Partial</Badge>;
            case 'RECEIVED': return <Badge className="bg-green-500 hover:bg-green-600 text-white border-0">Received</Badge>;
            case 'VERIFIED': return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-0">Verified</Badge>;
            case 'CANCELLED': return <Badge variant="destructive" className="bg-red-500 hover:bg-red-600">Cancelled</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6 pb-20 md:pb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Purchase Orders</h1>
                    <p className="text-gray-500 text-sm md:text-base">Manage stock replenishment and supplier orders</p>
                </div>
                <Link href="/outlet/orders/new" className="w-full md:w-auto">
                    <Button className="w-full md:w-auto bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95">
                        <Plus className="h-4 w-4 mr-2" />
                        New Order
                    </Button>
                </Link>
            </div>

            <div className="flex gap-2 pb-2 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                {['ALL', 'DRAFT', 'SENT', 'RECEIVED', 'CANCELLED'].map((status) => (
                    <Button
                        key={status}
                        variant={statusFilter === (status === 'ALL' ? null : status) ? "default" : "outline"}
                        onClick={() => setStatusFilter(status === 'ALL' ? null : status)}
                        className={`rounded-full whitespace-nowrap transition-all ${statusFilter === (status === 'ALL' ? null : status)
                                ? "shadow-md shadow-primary/20"
                                : "bg-white hover:bg-gray-50 border-gray-200 text-gray-600"
                            }`}
                        size="sm"
                    >
                        {status === 'ALL' ? 'All Orders' : status.charAt(0) + status.slice(1).toLowerCase()}
                    </Button>
                ))}
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <p className="text-gray-500 text-sm animate-pulse">Loading orders...</p>
                </div>
            ) : orders?.length === 0 ? (
                <Card className="border-dashed border-2 border-gray-200 bg-gray-50/50">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                            <Package className="h-8 w-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">No orders found</h3>
                        <p className="text-gray-500 mb-6 max-w-xs mx-auto text-sm">
                            Get started by creating your first purchase order to replenish your stock.
                        </p>
                        <Link href="/outlet/orders/new">
                            <Button variant="outline" className="bg-white hover:bg-gray-50">
                                Create First Order
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {orders?.map((order) => {
                        // Safe access to potential missing fields
                        const poNumber = (order as any).poNumber || order.id.slice(-6).toUpperCase();
                        const expectedDeliveryDate = (order as any).expectedDeliveryDate;

                        return (
                            <Link key={order.id} href={`/outlet/orders/${order.id}`}>
                                <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-gray-100 group active:scale-[0.99]">
                                    <CardContent className="p-5">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="space-y-3 flex-1">
                                                <div className="flex items-center justify-between sm:justify-start gap-3">
                                                    <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded text-sm">
                                                        #{poNumber}
                                                    </span>
                                                    {getStatusBadge(order.status)}
                                                </div>

                                                <div className="flex items-center gap-2 text-gray-700 font-medium">
                                                    <Truck className="h-4 w-4 text-gray-400" />
                                                    {order.supplier?.name || "Unknown Supplier"}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        {format(new Date(order.createdAt), "MMM d, yyyy")}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Package className="h-3.5 w-3.5" />
                                                        {order.items.length} items
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between sm:block sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 mt-1 sm:mt-0">
                                                <div className="text-xs text-gray-500 sm:hidden">Total Amount</div>
                                                <div>
                                                    <div className="text-xl font-bold text-gray-900">
                                                        ₹{Number(order.totalAmount).toFixed(2)}
                                                    </div>
                                                    {expectedDeliveryDate && (
                                                        <div className="text-xs text-orange-600 font-medium mt-1 bg-orange-50 px-2 py-0.5 rounded-full inline-block">
                                                            Due: {format(new Date(expectedDeliveryDate), "MMM d")}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
